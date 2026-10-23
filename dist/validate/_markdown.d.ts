/** Larger input fails closed (CWE-400). */
export declare const MAX_DOC_BYTES = 1048576;
/** Measured in UTF-8 bytes, matching MAX_HANDOVER_BYTES. */
export declare function exceedsSizeCap(md: string): boolean;
/** null when the line is not a fence delimiter. */
export declare function fenceCharOf(line: string): "`" | "~" | null;
/**
 * Lines outside fences, with 0-based index so callers can slice the source. CommonMark: only the
 * opening char closes a fence; an unterminated fence swallows the rest.
 */
export declare function contentLines(md: string): Generator<{
    index: number;
    text: string;
}>;
/** So a `**Origin:**`-style label inside a fenced example cannot satisfy a required-field check. */
export declare function stripFencedBlocks(md: string): string;
//# sourceMappingURL=_markdown.d.ts.map