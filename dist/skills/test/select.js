// #360 — choose which tests a changeset needs, for the TDD loop only.
//
// Why this exists rather than just calling `vitest related`: measured on this
// repo, `vitest related` against a `.md` file prints "No test files found" and
// exits **0**. It does not skip loudly — it reports success having run nothing.
// A large share of this repo's guards read their subject as data (SKILL.md,
// templates, the rulebook, mkdocs config) and import nothing from it, so the
// module graph cannot see the edge. Selection that silently covers none of them
// is worse than no selection at all.
//
// Scope: the inner loop (RED/GREEN). The pre-PR gate (§6.a) always runs the
// full suite — PR-02 forbids narrowing the selection at that boundary, and this
// module must never be wired into it. `sprint-close` likewise runs everything.
//
// The read-map is DATA, loaded from `<config-dir>/test-map.json`, never
// compiled in. This module ships to adopters in `dist/`; baking this repo's
// suite paths into it would hand every adopter a map to files they do not have,
// selecting nothing while reporting success — the very defect above, one level
// up. The config directory is brand-resolved (AD-16), not the literal `.3c`.
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
/** Bounds on a file read from the working tree (CWE-400/770). */
const MAX_RULES = 64;
const MAX_SUITES = 64;
const MAX_PATHS = 64;
const MAX_STRING = 256;
const MAX_BYTES = 64 * 1024;
/** Bound on the changeset too — its peer input, and just as external. */
const MAX_CHANGED = 5000;
export const TEST_MAP_FILE = "test-map.json";
const norm = (p) => p.replace(/\\/g, "/");
/**
 * Strip control characters and clamp before printing. These strings come from a
 * working-tree file and are read by an AGENT as well as a human — an unescaped
 * escape sequence is both a forged-console-line trick and an indirect
 * prompt-injection channel (CWE-117).
 */
const clean = (s) => s.replace(/[\u0000-\u001f\u007f]/g, "?").slice(0, MAX_STRING);
/** Changes whose reach is repo-wide: never guess, run everything. */
function fullSuiteTriggers(configDir) {
    const dir = configDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [
        /^package(-lock)?\.json$/,
        /^tsconfig[^/]*\.json$/,
        /^vitest\.config\.[cm]?[jt]s$/,
        new RegExp(`^${dir}/`),
        /^framework\.json$/,
        /^scripts\//,
    ];
}
/** A file the runner can actually execute — not merely a path under tests/. */
const isTestFile = (p) => /\.(test|spec)\.[cm]?tsx?$/.test(p);
const isSource = (p) => /^src\/.*\.[cm]?tsx?$/.test(p);
/**
 * Decide what a changeset needs, given a read-map. Never returns a selection
 * that would run nothing while looking like success: an unmapped path escalates
 * to the full suite, and "nothing changed" is its own explicit mode.
 *
 * The map is consulted for EVERY path, not only for ones that are neither
 * source nor test. Source files are read as data too — `tests/docs/
 * developer-guide-audit.test.ts` reads `src/cli.ts` without importing it — so
 * short-circuiting on `isSource` would make those guards unselectable.
 */
export function selectTests(changed, reads, configDir = ".3c") {
    const all = changed.map(norm).filter((p) => p.length > 0);
    const paths = all.slice(0, MAX_CHANGED);
    if (paths.length === 0) {
        return { mode: "empty", full: false, related: [], files: [], reason: "no files changed" };
    }
    if (all.length > MAX_CHANGED) {
        return {
            mode: "full",
            full: true,
            related: [],
            files: [],
            reason: `changeset of ${all.length} files exceeds the ${MAX_CHANGED} selection cap`,
        };
    }
    const triggers = fullSuiteTriggers(configDir);
    const full = paths.filter((p) => triggers.some((re) => re.test(p)));
    if (full.length > 0) {
        return {
            mode: "full",
            full: true,
            related: [],
            files: [],
            reason: `repo-wide reach: ${full.slice(0, 10).map(clean).join(", ")}`,
        };
    }
    const related = [];
    const files = new Set();
    const unmapped = [];
    for (const p of paths) {
        let covered = false;
        // Map first, and always. Literal prefix match — patterns are config, and a
        // config-supplied regex would be a ReDoS surface bought for no
        // expressiveness anyone needs. An empty prefix would match every path and
        // suppress the unmapped escalation, so it is never honoured.
        for (const r of reads) {
            if (!r.paths.some((prefix) => prefix.length > 0 && p.startsWith(prefix)))
                continue;
            for (const s of r.suites) {
                if (s.length === 0)
                    continue;
                files.add(s);
                covered = true;
            }
        }
        if (isTestFile(p)) {
            files.add(p);
            covered = true;
        }
        else if (isSource(p)) {
            related.push(p);
            covered = true;
        }
        if (!covered)
            unmapped.push(p);
    }
    if (unmapped.length > 0) {
        // Fail closed. A path nobody mapped might be read by any suite; running
        // everything is the only honest answer, and it must be stated.
        const shown = unmapped.slice(0, 10).map(clean).join(", ");
        const more = unmapped.length > 10 ? ` and ${unmapped.length - 10} more` : "";
        return {
            mode: "full",
            full: true,
            related: [],
            files: [],
            reason: `could not map ${unmapped.length} path(s), running everything: ${shown}${more}`,
        };
    }
    const mode = related.length > 0 && files.size > 0 ? "mixed" : related.length > 0 ? "related" : "mapped";
    return {
        mode,
        full: false,
        related,
        files: [...files].sort(),
        reason: `${mode}: ${related.length} source file(s) via module graph, ` +
            `${files.size} suite(s) that read a changed non-module input`,
    };
}
/** How each framework runs everything. The honest fallback for all of them. */
const FULL_RUN = {
    vitest: "npx vitest run",
    jest: "npx jest",
    pytest: "pytest",
    mocha: "npx mocha",
    playwright: "npx playwright test",
    junit: "mvn test",
    unknown: "npm test",
};
/** Only these two have a module-graph related-mode worth using. */
const RELATED_RUN = {
    vitest: "npx vitest related --run",
    jest: "npx jest --findRelatedTests",
};
/**
 * Paths safe to compose into a printed command line without quoting (A05/CWE-88).
 * The leading-dash exclusion is load-bearing: `npx vitest run -x.test.ts` is not
 * a filename, it is a flag, and the runner will honour it.
 */
const SHELL_SAFE = /^(?!-)[A-Za-z0-9._/@-]+$/;
/**
 * Turn a selection into the command(s) to run. Measured: `vitest run` has no
 * `--related` flag (v4 exposes only the separate `vitest related` subcommand),
 * so a mixed changeset genuinely needs two invocations — ~11s against a 16.9s
 * full run, still a win. A framework with no related-mode gets the full suite
 * rather than a guess.
 */
export function selectionCommands(sel, framework) {
    const full = FULL_RUN[framework] ?? FULL_RUN.unknown;
    if (sel.mode === "empty")
        return [];
    if (sel.full)
        return [full];
    // Never compose an unquoted path with shell syntax — or a leading dash — into
    // a command line someone is going to paste. Widening is the safe direction.
    const unsafe = [...sel.related, ...sel.files].filter((p) => !SHELL_SAFE.test(p));
    if (unsafe.length > 0)
        return [full];
    const relatedRun = RELATED_RUN[framework];
    if (sel.related.length > 0 && relatedRun === undefined)
        return [full];
    const cmds = [];
    if (sel.related.length > 0)
        cmds.push(`${relatedRun} ${sel.related.join(" ")}`);
    if (sel.files.length > 0)
        cmds.push(`${full} ${sel.files.join(" ")}`);
    return cmds.length > 0 ? cmds : [full];
}
/**
 * Is this safe to hand `git` as a revision argument? `execFile`'s array form
 * already rules out shell injection; this rules out ARGUMENT injection, which
 * it does not — a leading `-` makes git read the value as an option. `..` is
 * banned because the caller composes the range itself.
 */
export function isSafeRef(ref) {
    return /^[A-Za-z0-9][A-Za-z0-9._/~^-]{0,99}$/.test(ref) && !ref.includes("..");
}
/**
 * A slug is a path segment, a regex literal and a log string. Validate it as
 * all three; 2-32 admits the framework's own two-character slug.
 */
const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,31}$/;
/**
 * The directory deployment-local config lives in (`.3c/`).
 *
 * #451 retired custom branding, so neither the workspace's own `branding.json`
 * (which this used to consult FIRST) nor the workspace's `framework.json` is
 * read: the directory is the package slug's, as it is for every other command.
 *
 * The slug is still validated before use. This value becomes a path segment
 * (`join(root, dir, …)`), a regular-expression literal, and a string echoed to
 * a console an agent reads — a slug of `./../..` would walk out of the
 * repository. Anything that does not match the project's slug pattern is
 * discarded rather than sanitised.
 */
export function testMapDir(_root) {
    // The PACKAGE's slug only (#451 board, security lens). A workspace has no
    // legitimate identity override any more, so reading the workspace's own
    // framework.json would leave one untrusted file able to steer the directory
    // (within SLUG_OK, but still steering). `_root` stays in the signature for
    // the callers that pass it.
    try {
        const slug = resolveBrandSlugSync();
        if (SLUG_OK.test(slug))
            return `.${slug}`;
    }
    catch {
        // fall through to the framework default
    }
    return ".3c";
}
const str = (v) => typeof v === "string" && v.length > 0 && v.length <= MAX_STRING;
/**
 * Load `<config-dir>/test-map.json` from `root`. A missing file is the normal
 * adopter case and loads as empty. Anything malformed is rejected wholesale,
 * and any individual rule naming a missing or escaping suite is dropped with a
 * warning — dropped paths become unmapped, which escalates to the full suite.
 */
export function loadTestMap(root) {
    const configDir = testMapDir(root);
    const file = join(root, configDir, TEST_MAP_FILE);
    const where = `${configDir}/${TEST_MAP_FILE}`;
    if (!existsSync(file))
        return { reads: [], warnings: [], configDir };
    // Size first, on the handle's metadata — checking after readFileSync would
    // have already buffered the whole file, which is not a CWE-400 control.
    try {
        if (statSync(file).size > MAX_BYTES) {
            return { reads: [], warnings: [`${where}: exceeds ${MAX_BYTES} bytes`], configDir };
        }
    }
    catch (e) {
        return { reads: [], warnings: [`${where}: unstattable (${clean(e.message)})`], configDir };
    }
    let raw;
    try {
        raw = readFileSync(file, "utf8");
    }
    catch (e) {
        return { reads: [], warnings: [`${where}: unreadable (${clean(e.message)})`], configDir };
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (e) {
        return { reads: [], warnings: [`${where}: invalid JSON (${clean(e.message)})`], configDir };
    }
    const entries = parsed?.reads;
    if (!Array.isArray(entries)) {
        return { reads: [], warnings: [`${where}: missing a "reads" array`], configDir };
    }
    if (entries.length > MAX_RULES) {
        return { reads: [], warnings: [`${where}: too many rules (max ${MAX_RULES})`], configDir };
    }
    const warnings = [];
    const reads = [];
    const realRoot = (() => {
        try {
            return realpathSync(resolve(root));
        }
        catch {
            return resolve(root);
        }
    })();
    for (const [i, entry] of entries.entries()) {
        const at = `${where} rule ${i}`;
        const e = entry;
        if (!Array.isArray(e?.paths) || !Array.isArray(e?.suites)) {
            warnings.push(`${at}: needs "paths" and "suites" arrays`);
            continue;
        }
        if (e.paths.length > MAX_PATHS) {
            warnings.push(`${at}: too many paths (max ${MAX_PATHS})`);
            continue;
        }
        if (e.suites.length > MAX_SUITES) {
            warnings.push(`${at}: too many suites (max ${MAX_SUITES})`);
            continue;
        }
        const paths = e.paths.filter(str).map(norm);
        if (paths.length !== e.paths.length)
            warnings.push(`${at}: dropped a non-string or empty path`);
        const suites = [];
        for (const s of e.suites) {
            if (!str(s)) {
                warnings.push(`${at}: dropped a non-string or empty suite`);
                continue;
            }
            const p = norm(s);
            if (isAbsolute(p) || isAbsolute(s)) {
                warnings.push(`${at}: "${clean(s)}" is absolute — suites must be repo-relative`);
                continue;
            }
            const target = resolve(root, p);
            if (!existsSync(target)) {
                // The rot case: a renamed or deleted suite. Dropping it widens the run;
                // keeping it would narrow a run to a file that cannot execute.
                warnings.push(`${at}: "${clean(s)}" does not exist — rule dropped`);
                continue;
            }
            // CWE-22: resolve THEN contain, and resolve through symlinks — a lexical
            // check alone lets a symlinked suite point anywhere on the filesystem.
            let real;
            try {
                real = realpathSync(target);
            }
            catch {
                real = target;
            }
            const rel = relative(realRoot, real);
            if (rel.startsWith("..") || isAbsolute(rel)) {
                warnings.push(`${at}: "${clean(s)}" resolves outside the repository`);
                continue;
            }
            suites.push(p);
        }
        if (paths.length === 0 || suites.length !== e.suites.length || suites.length === 0) {
            if (suites.length !== e.suites.length)
                warnings.push(`${at}: incomplete — rule dropped`);
            continue;
        }
        reads.push({ paths, suites });
    }
    return { reads, warnings, configDir };
}
//# sourceMappingURL=select.js.map