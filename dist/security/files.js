// The file set the security gate scans. Deliberately not shared with any other
// caller: these four states are what this gate needs, and widening a shared
// helper to include untracked files would change its other callers' results.
//
//   * unstaged  — the pre-commit hook's moment;
//   * staged    — `git add`ed, about to be committed;
//   * untracked — a NEWLY WRITTEN file, which is what a generated test is;
//   * committed since the merge-base — what `/3c-review-board` meets, where
//     `git diff` and `git diff --cached` are BOTH empty; without it the gate
//     scans nothing for its documented consumer.
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { defaultGitRunner } from "./git.js";
import { readWorkspaceFile } from "./advisories.js";
/**
 * The base ref could not be resolved, so the span to scan is unknown. Callers
 * MUST fail closed on this (a10-exception-handling): a pass over a tree the
 * gate never read is a fail-open.
 */
export class SecurityBaseError extends Error {
    constructor(message) {
        super(message);
        this.name = "SecurityBaseError";
    }
}
const MANIFEST = /(?:^|\/)(?:package|package-lock|npm-shrinkwrap)\.json$/;
export const MAX_MANIFESTS = 50;
export const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
/**
 * Refs tried, in order, when no `--base` is given. An adopter whose default
 * branch is none of these gets an actionable refusal, not a zero-file pass.
 */
const BASE_CANDIDATES = [
    "refs/remotes/origin/HEAD",
    "refs/remotes/origin/main",
    "refs/remotes/origin/master",
    "refs/heads/main",
    "refs/heads/master",
];
const CANDIDATE_LABELS = "origin/HEAD, origin/main, origin/master, main, master";
/**
 * CWE-400. The untracked half is unbounded — a never-committed workspace lists
 * its whole tree — and every path becomes a file read. Both caps fail closed
 * with a route that narrows the set.
 */
export const MAX_SCANNED_FILES = 5000;
export const MAX_SCANNED_BYTES = 1_048_576;
/**
 * Pick which of several concurrent git failures is reported as THE cause,
 * ranked by how much the message tells the reader:
 *
 *   3. names the missing repository, as a `fatal:`
 *   2. names the missing repository at all (`git diff` says it as a `warning:`)
 *   1. any other `fatal:` — a real failure inside a real repository
 *   0. everything else, including git usage errors such as
 *      `error: unknown option \`cached'`, which point at this CLI and give the
 *      reader nothing to act on
 *
 * Ties keep array order, so the choice is stable across runs and platforms.
 */
function mostInformative(failures) {
    const rank = (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        const repo = /not a git repository/i.test(msg);
        if (repo && /^fatal:/im.test(msg))
            return 3;
        if (repo)
            return 2;
        if (/^fatal:/im.test(msg))
            return 1;
        return 0;
    };
    let best = failures[0];
    let bestRank = rank(best);
    for (const f of failures.slice(1)) {
        const r = rank(f);
        if (r > bestRank) {
            best = f;
            bestRank = r;
        }
    }
    return best;
}
const lines = (out) => 
// No trim(): a path may begin or end with a space.
out.split(/\r?\n/).filter((l) => l !== "");
export async function securityFileSet(workspaceDir, opts = {}) {
    const runner = opts.runner ?? defaultGitRunner;
    // `core.quotePath=false` so a non-ASCII path arrives as a path, not git's
    // octal-escaped rendering that never resolves on disk.
    const git = (args) => runner(["-C", workspaceDir, "-c", "core.quotePath=false", ...args]);
    /** For probes where "this ref does not exist" is an answer, not a failure. */
    const probe = async (args) => {
        try {
            const out = (await git(args)).trim();
            return out === "" ? null : out;
        }
        catch {
            return null;
        }
    };
    const base = await resolveBase(probe, opts.base);
    // NOT probes: a git failure here must throw, never degrade to an empty set.
    const settled = await Promise.allSettled([
        git(["diff", "--name-only", "--no-color"]).then(lines),
        git(["diff", "--cached", "--name-only", "--no-color"]).then(lines),
        git(["ls-files", "--others", "--exclude-standard"]).then(lines),
        base === null
            ? Promise.resolve([])
            : git(["diff", "--name-only", "--no-color", base]).then(lines),
    ]);
    // `allSettled` + a fixed ranking, not `Promise.all`: outside a repository all
    // four fail with different messages, and `Promise.all` would report whichever
    // settled first — often git rejecting `--cached` before repository discovery.
    // Any rejection still throws. A pre-flight `rev-parse` would add a spawn on a
    // path budgeted to run as a hook.
    const failures = settled.flatMap((s) => (s.status === "rejected" ? [s.reason] : []));
    if (failures.length > 0)
        throw mostInformative(failures);
    const [unstaged, staged, untracked, committed] = settled.map((s) => s.status === "fulfilled" ? s.value : []);
    const files = [...new Set([...unstaged, ...staged, ...untracked, ...committed])].sort();
    if (files.length > MAX_SCANNED_FILES) {
        throw new SecurityBaseError(`${files.length} files are in scope, above the ${MAX_SCANNED_FILES}-file scan cap. ` +
            `Narrow the span with \`--base=<ref>\`, or add build output and vendored ` +
            `directories to .gitignore.`);
    }
    // CWE-400 per file: the scanner reads whole contents. Oversize files are
    // reported, because a file the gate did not read is not a file it found clean.
    const scannable = [];
    const skipped = [];
    for (const rel of files) {
        let size;
        try {
            size = (await stat(join(workspaceDir, rel))).size;
        }
        catch {
            continue; // deleted in this span, or unreadable — nothing to scan
        }
        if (size > MAX_SCANNED_BYTES)
            skipped.push(rel);
        else
            scannable.push(rel);
    }
    // From `files`, not `scannable`: a lockfile over the scan's byte cap is still
    // a set of dependencies the change installs.
    const manifestPaths = files.filter((f) => MANIFEST.test(f));
    if (manifestPaths.length > MAX_MANIFESTS) {
        throw new SecurityBaseError(`${manifestPaths.length} package manifests are in scope, above the ${MAX_MANIFESTS}-manifest cap. ` +
            (opts.base === undefined ? "Narrow the span with `--base=<ref>`." : `Choose a base nearer this change than ${opts.base}.`));
    }
    const manifests = await Promise.all(manifestPaths.map(async (path) => ({
        path,
        base: base === null ? null : await probe(["show", `${base}:${path}`]),
        head: await readManifest(join(workspaceDir, path)),
    })));
    return { files: scannable, skipped, base, manifests };
}
/**
 * A manifest's current content, or null when the change deletes it. One that
 * is over the cap, a link, or unreadable reads as text that does not parse, so
 * the gate fails closed rather than skipping the dependencies it holds.
 */
async function readManifest(path) {
    const r = await readWorkspaceFile(path, MAX_MANIFEST_BYTES);
    if (r.kind === "absent")
        return null;
    return r.kind === "read" ? r.text : "";
}
async function resolveBase(probe, explicit) {
    const head = await probe(["rev-parse", "--verify", "--quiet", "HEAD"]);
    if (explicit !== undefined) {
        if (head === null) {
            throw new SecurityBaseError(`--base=${explicit} was requested, but this repository has no commits to diff against.`);
        }
        const merged = await probe(["merge-base", explicit, "HEAD"]);
        if (merged === null) {
            throw new SecurityBaseError(`cannot resolve --base=${explicit} — no such ref, or it shares no history with HEAD.`);
        }
        return merged;
    }
    // No commits: the committed half is honestly empty, and staged + untracked
    // still cover everything that exists.
    if (head === null)
        return null;
    // One `for-each-ref` rather than a `rev-parse` per candidate: process spawn
    // dominates cost (especially on Windows) under a hook's time budget.
    const listed = await probe(["for-each-ref", "--format=%(refname)", ...BASE_CANDIDATES]);
    // `probe` cannot tell "no candidate exists" from "the spawn failed", so an
    // empty result falls back to probing each candidate rather than refusing.
    const present = listed === null ? null : new Set(lines(listed));
    for (const candidate of BASE_CANDIDATES) {
        if (present !== null && !present.has(candidate))
            continue;
        if (present === null && (await probe(["rev-parse", "--verify", "--quiet", candidate])) === null) {
            continue;
        }
        const merged = await probe(["merge-base", candidate, "HEAD"]);
        if (merged !== null)
            return merged;
    }
    throw new SecurityBaseError(`cannot determine a base ref to scan against (tried ${CANDIDATE_LABELS}). ` +
        `Pass \`--base=<ref>\` naming your default branch.`);
}
//# sourceMappingURL=files.js.map