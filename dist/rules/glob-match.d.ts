export declare const MAX_GLOB_LENGTH = 200;
/** Nested groups included. */
export declare const MAX_BRACE_GROUPS = 8;
/**
 * Counted in the raw text, so every brace alternative counts. A failing match
 * is polynomial in path depth with this as the exponent: on a 30-deep path
 * `**\/` x6 took 220ms, x8 10.1s, `{**\/,}` x8 42s (hook timeout: 12s).
 */
export declare const MAX_GLOBSTARS = 4;
/** What to tell an author whose glob `globProblem` refused. */
export declare const GLOB_REMEDIATION: string;
/**
 * Why a glob cannot be used, or null. Loaders call this so a malformed or
 * pathological glob is refused, not matched literally or left to hang a match
 * (CWE-400/CWE-1333).
 */
export declare function globProblem(glob: string): string | null;
export declare function globToRegex(glob: string): RegExp;
export declare function matchAny(globs: ReadonlyArray<string>, files: ReadonlyArray<string>): boolean;
//# sourceMappingURL=glob-match.d.ts.map