// #408: the file set the security gate scans.
//
// Deliberately NOT the shared `gitChangedLines` this replaced. That function
// had a second caller, `evaluateCoverageGate`, which marked every changed line
// of a file with no coverage entry as uncovered — so widening it to include
// untracked files would have silently failed the coverage gate on new
// fixtures, docs and config. Both symbols were retired with `coverage-gate`
// (#396); the constraint is recorded in the past tense because the
// counter-example is no longer in the tree to check. The decision stands on
// its own terms: the four states below are what the security gate needs, and
// no other caller should be made to share them.
//
// The states a change is actually in, and why all four are needed:
//   * unstaged  — the pre-commit hook's moment;
//   * staged    — `git add`ed, about to be committed;
//   * untracked — a NEWLY WRITTEN file, which is what a generated test is;
//   * committed since the merge-base — the state `/3c-review-board` meets, where
//     `git diff` and `git diff --cached` are BOTH empty. The gate's only
//     documented consumer has always run in exactly this state, so a file set
//     without it scans nothing for the one caller that exists.
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { defaultGitRunner } from "./git.js";
/**
 * The base ref could not be resolved, so the span to scan is unknown. Callers
 * MUST fail closed on this (a10-exception-handling): a gate that reports a pass
 * over a tree it never read is the defect #408 exists to close.
 */
export class SecurityBaseError extends Error {
    constructor(message) {
        super(message);
        this.name = "SecurityBaseError";
    }
}
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
/** Short names for the refusal message — full refspecs are noise to an adopter. */
const CANDIDATE_LABELS = "origin/HEAD, origin/main, origin/master, main, master";
/**
 * CWE-400. The untracked half is unbounded by construction — a workspace that
 * has never been committed lists its entire tree — and every path here becomes
 * a file read. Both caps fail closed with a route that narrows the set.
 */
export const MAX_SCANNED_FILES = 5000;
export const MAX_SCANNED_BYTES = 1_048_576;
/**
 * Pick which of several concurrent git failures is reported as THE cause (#422).
 *
 * Ranked by how much the message tells the reader, not by which finished first:
 *
 *   3. names the missing repository, as a `fatal:` — git's clearest statement
 *   2. names the missing repository at all (`git diff` says it as a `warning:`)
 *   1. any other `fatal:` — a real failure inside a real repository
 *   0. everything else, including git USAGE errors
 *
 * Rank 0 is where `error: unknown option \`cached'` lands. It is never chosen
 * over a message that names a cause, which is the whole point: a usage error
 * points the reader at this CLI, and there is nothing they can do with it.
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
// No trim() per entry: a path may legitimately begin or end with a space, and
// silently renaming it would drop it from the scan.
out.split(/\r?\n/).filter((l) => l !== "");
export async function securityFileSet(workspaceDir, opts = {}) {
    const runner = opts.runner ?? defaultGitRunner;
    // `core.quotePath=false` so a non-ASCII path arrives as a path rather than as
    // git's octal-escaped rendering of one, which would never resolve on disk.
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
    // These four are NOT probes. A git failure here (an I/O error, or a listing
    // that overflows the runner's buffer) must not degrade to an empty file set —
    // that is the fail-open this whole issue is about.
    const settled = await Promise.allSettled([
        git(["diff", "--name-only", "--no-color"]).then(lines),
        git(["diff", "--cached", "--name-only", "--no-color"]).then(lines),
        git(["ls-files", "--others", "--exclude-standard"]).then(lines),
        base === null
            ? Promise.resolve([])
            : git(["diff", "--name-only", "--no-color", base]).then(lines),
    ]);
    // #422. `Promise.all` rejects with whichever of the four settles FIRST, and in
    // a directory that is not a repository all four fail with three different
    // messages — so the cause reported to the user was decided by scheduling.
    // One of the three is git's option parser rejecting `--cached` before
    // repository discovery runs, which names nothing an adopter can act on and
    // reads as a bug in this CLI passing a bad flag to git.
    //
    // #408 added this refusal so a block would carry a route forward; leaving the
    // cause to a race satisfied that only probabilistically, and the guard pinning
    // it failed under full-suite concurrency rather than in isolation.
    //
    // `allSettled` + a fixed ranking keeps the failure closed exactly as before —
    // any rejection still throws — while making WHICH cause is reported a property
    // of the messages rather than of the scheduler. Adding a pre-flight
    // `rev-parse` probe instead would have been one more git invocation on a path
    // sequenced to become a 10s-budget hook (#384/#401).
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
    // CWE-400 again, per file: the scanner reads whole file contents, and the
    // untracked half can now surface a vendored bundle or a media asset. Oversize
    // files are REPORTED rather than dropped — a file the gate did not read is
    // not a file the gate found clean.
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
    const depDiff = base === null
        ? [
            await git(["diff", "--unified=0", "--no-color"]),
            await git(["diff", "--cached", "--unified=0", "--no-color"]),
        ].join("\n")
        : await git(["diff", "--unified=0", "--no-color", base]);
    return { files: scannable, skipped, base, depDiff };
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
    // No commits at all: nothing is committed, so the committed half is honestly
    // empty. This is not the unresolvable case — the staged and untracked halves
    // still cover everything that exists.
    if (head === null)
        return null;
    // ONE `for-each-ref` rather than a `rev-parse` per candidate. Process spawn
    // dominates this function's cost — especially on Windows — and probing five
    // refs individually made every scan pay for four failures before its first
    // success. The gate is sequenced to become a hook (#384/#401) under a 10s
    // budget, so the fixed cost per invocation is not free.
    const listed = await probe(["for-each-ref", "--format=%(refname)", ...BASE_CANDIDATES]);
    // `probe` cannot tell "no candidate exists" from "the spawn failed", and this
    // is now ONE call covering all five candidates — so a single failure would
    // refuse to scan a repository whose default branch is sitting right there.
    // An empty result falls back to asking per candidate, which degrades one ref
    // at a time the way the pre-batch form did.
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