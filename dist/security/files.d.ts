import { type GitRunner } from "./git.js";
/**
 * The base ref could not be resolved, so the span to scan is unknown. Callers
 * MUST fail closed on this (a10-exception-handling): a pass over a tree the
 * gate never read is a fail-open.
 */
export declare class SecurityBaseError extends Error {
    constructor(message: string);
}
export interface SecurityFileSetOptions {
    readonly runner?: GitRunner;
    /** Explicit base ref. Unresolvable ⇒ SecurityBaseError; never a silent fallback. */
    readonly base?: string;
}
export interface SecurityFileSet {
    /** Repo-relative posix paths, deduplicated and sorted. */
    readonly files: readonly string[];
    /** Files skipped for exceeding MAX_SCANNED_BYTES — reported, never silently dropped. */
    readonly skipped: readonly string[];
    /** Resolved base commit, or null when the repository has no commits yet. */
    readonly base: string | null;
    /** Diff over the same span, for the dependency half. */
    readonly depDiff: string;
}
/**
 * CWE-400. The untracked half is unbounded — a never-committed workspace lists
 * its whole tree — and every path becomes a file read. Both caps fail closed
 * with a route that narrows the set.
 */
export declare const MAX_SCANNED_FILES = 5000;
export declare const MAX_SCANNED_BYTES = 1048576;
export declare function securityFileSet(workspaceDir: string, opts?: SecurityFileSetOptions): Promise<SecurityFileSet>;
//# sourceMappingURL=files.d.ts.map