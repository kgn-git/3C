import type { Framework } from "./detect-framework.js";
/** One mapping: any changed path under `paths` requires `suites` to run. */
export interface ReadRule {
    /** Literal path prefixes, POSIX-separated. Never regular expressions. */
    readonly paths: ReadonlyArray<string>;
    /** Repo-relative test files to run when a prefix matches. */
    readonly suites: ReadonlyArray<string>;
}
/** What to run, and why that was chosen. */
export interface Selection {
    /** `related` = hand to the runner's module-graph selection; `mapped` = explicit
     *  suites; `mixed` = both; `full` = run everything; `empty` = nothing changed. */
    readonly mode: "related" | "mapped" | "mixed" | "full" | "empty";
    /** Run the entire suite. Set whenever reach is repo-wide or unknown. */
    readonly full: boolean;
    /** Source files to pass to the runner's related-selection. */
    readonly related: ReadonlyArray<string>;
    /** Test files selected because they READ a changed non-module input. */
    readonly files: ReadonlyArray<string>;
    /** Human-readable justification. Printed, so a narrowed run is never silent. */
    readonly reason: string;
}
/** A loaded map plus everything that was rejected while loading it. */
export interface LoadedMap {
    readonly reads: ReadonlyArray<ReadRule>;
    /** Rejected entries, in words. Printed — an unreported drop is how a map rots. */
    readonly warnings: ReadonlyArray<string>;
    /** The brand-resolved config directory the map was looked for in. */
    readonly configDir: string;
}
export declare const TEST_MAP_FILE = "test-map.json";
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
export declare function selectTests(changed: ReadonlyArray<string>, reads: ReadonlyArray<ReadRule>, configDir?: string): Selection;
/**
 * Turn a selection into the command(s) to run. Measured: `vitest run` has no
 * `--related` flag (v4 exposes only the separate `vitest related` subcommand),
 * so a mixed changeset genuinely needs two invocations — ~11s against a 16.9s
 * full run, still a win. A framework with no related-mode gets the full suite
 * rather than a guess.
 */
export declare function selectionCommands(sel: Selection, framework: Framework): ReadonlyArray<string>;
/**
 * Is this safe to hand `git` as a revision argument? `execFile`'s array form
 * already rules out shell injection; this rules out ARGUMENT injection, which
 * it does not — a leading `-` makes git read the value as an option. `..` is
 * banned because the caller composes the range itself.
 */
export declare function isSafeRef(ref: string): boolean;
/**
 * The directory deployment-local config lives in (`.3c/`).
 *
 * Custom branding is not supported, so neither the workspace's own
 * `branding.json` nor the workspace's `framework.json` is read: the directory is the package slug's, as it is for every other command.
 *
 * The slug is still validated before use. This value becomes a path segment
 * (`join(root, dir, …)`), a regular-expression literal, and a string echoed to
 * a console an agent reads — a slug of `./../..` would walk out of the
 * repository. Anything that does not match the project's slug pattern is
 * discarded rather than sanitised.
 */
export declare function testMapDir(_root: string): string;
/**
 * Load `<config-dir>/test-map.json` from `root`. A missing file is the normal
 * adopter case and loads as empty. Anything malformed is rejected wholesale,
 * and any individual rule naming a missing or escaping suite is dropped with a
 * warning — dropped paths become unmapped, which escalates to the full suite.
 */
export declare function loadTestMap(root: string): LoadedMap;
//# sourceMappingURL=select.d.ts.map