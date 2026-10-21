/** Characters allowed in one glob. */
export declare const MAX_GLOB_LENGTH = 200;
/** Brace groups allowed in one glob, nested groups included (#464). */
export declare const MAX_BRACE_GROUPS = 8;
/**
 * `**` occurrences allowed in one glob, counted in the raw text so every
 * brace alternative counts. Each compiles to a star group, and ambiguous star
 * groups make a FAILING match polynomial in path depth with the count as the
 * exponent. Measured on a 30-deep non-matching path (#464 board): `**\/` x4
 * 5ms, x5 36ms, x6 220ms, x8 10.1s — #430's old cap of 8 sat past the
 * post-edit hook's 12s timeout — and `{**\/,}` x8 took 42s.
 */
export declare const MAX_GLOBSTARS = 4;
/** What to tell an author whose glob `globProblem` refused. */
export declare const GLOB_REMEDIATION: string;
/**
 * Why a glob cannot be used, or null. Every loader of globs calls this, so a
 * malformed or pathological glob is refused when it is loaded — never matched
 * as literal text, and never left to hang a match (CWE-400/CWE-1333).
 */
export declare function globProblem(glob: string): string | null;
export declare function globToRegex(glob: string): RegExp;
export declare function matchAny(globs: ReadonlyArray<string>, files: ReadonlyArray<string>): boolean;
//# sourceMappingURL=glob-match.d.ts.map