/** Maximum document size any validator will process; larger input fails closed (CWE-400). */
export declare const MAX_DOC_BYTES = 1048576;
/**
 * True if `md` exceeds the size cap (measured in UTF-8 bytes, mirroring handover.ts's
 * MAX_HANDOVER_BYTES). Callers fail closed above the cap rather than materialising unbounded input.
 */
export declare function exceedsSizeCap(md: string): boolean;
/**
 * The fence char a line opens or closes, or null if the line is not a fence delimiter. A fence
 * line starts (after leading whitespace) with ``` (backtick) or ~~~ (tilde).
 */
export declare function fenceCharOf(line: string): "`" | "~" | null;
/**
 * Iterate the lines of `md` that lie OUTSIDE fenced code blocks, each with its 0-based
 * source-line index so call-sites can slice the original document by index. Fence delimiter lines
 * are not yielded. Same-char close (CommonMark fidelity): a ``` fence is not closed by a ~~~ line
 * and vice versa; an unterminated fence swallows the rest of the document.
 */
export declare function contentLines(md: string): Generator<{
    index: number;
    text: string;
}>;
/**
 * `md` with all fenced regions (and their delimiters) removed, for fence-aware field extraction —
 * so a `**Origin:**`-style label inside a prose example cannot satisfy a required-field check.
 */
export declare function stripFencedBlocks(md: string): string;
//# sourceMappingURL=_markdown.d.ts.map