/**
 * The first block of lines under a Decision heading, and any line that opens with a Decision marker, in order,
 * without repeats. The heading alone sets a block apart as a ruling; the block ends at the first blank line after a
 * ruling line, or at the next heading. A checkbox is a criterion and never a ruling.
 */
export declare function extractDecided(body: string): string[];
/** The date a ruling line carries before its colon ("Owner decision (2026-10-25): …"), or null; a date in the text is not the ruling's. */
export declare function rulingDate(line: string): string | null;
/** The acceptance criteria: every checkbox line. */
export declare function extractCriteria(body: string): string[];
/**
 * Whether `path` may reach the command line and the filesystem: relative, inside the repository, no `..` anywhere,
 * no option-looking segment, no pathspec magic, no glob, no drive or backslash, and nothing a terminal would act on
 * (CWE-22, CWE-88).
 */
export declare function isSafePath(path: string): boolean;
/** The repository files `text` names, safe to hand to git, in order of first mention, without repeats. */
export declare function extractFiles(...texts: ReadonlyArray<string>): string[];
/** Whether `text` names `path` as a whole path, not as the tail or the start of a longer one. */
export declare function mentionsPath(text: string, path: string): boolean;
/** Whether `text` mentions issue `n` as `#n` and not as the start of a longer number. */
export declare function mentionsIssue(text: string, n: number): boolean;
/** Every issue number `text` mentions as `#n`. */
export declare function issueRefs(text: string): number[];
//# sourceMappingURL=brief-text.d.ts.map