// #317: shared markdown fence-awareness helper for the src/validate/ validators.
// Extracted from self-critique.ts's CommonMark fence state machine (#308→#313 AC6): a fence
// opened with one char (``` or ~~~) is closed ONLY by the same char. Before this, the four
// validators each reinvented fence-skipping divergently (backtick-only, or a mixed-char toggle
// that let a ~~~ line close a ``` fence) — the divergence the #305–#308 review board flagged.
// All four now consume this single implementation. Local in-memory string parsing only.
/** Maximum document size any validator will process; larger input fails closed (CWE-400). */
export const MAX_DOC_BYTES = 1_048_576;
/**
 * True if `md` exceeds the size cap (measured in UTF-8 bytes, mirroring handover.ts's
 * MAX_HANDOVER_BYTES). Callers fail closed above the cap rather than materialising unbounded input.
 */
export function exceedsSizeCap(md) {
    return Buffer.byteLength(md, "utf8") > MAX_DOC_BYTES;
}
/**
 * The fence char a line opens or closes, or null if the line is not a fence delimiter. A fence
 * line starts (after leading whitespace) with ``` (backtick) or ~~~ (tilde).
 */
export function fenceCharOf(line) {
    const m = line.trimStart();
    if (m.startsWith("```"))
        return "`";
    if (m.startsWith("~~~"))
        return "~";
    return null;
}
/**
 * Iterate the lines of `md` that lie OUTSIDE fenced code blocks, each with its 0-based
 * source-line index so call-sites can slice the original document by index. Fence delimiter lines
 * are not yielded. Same-char close (CommonMark fidelity): a ``` fence is not closed by a ~~~ line
 * and vice versa; an unterminated fence swallows the rest of the document.
 */
export function* contentLines(md) {
    const lines = md.split(/\r?\n/);
    // null = not in a fence; "`" / "~" = the char that opened the active fence.
    let fenceChar = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined)
            continue;
        const c = fenceCharOf(line);
        if (c !== null) {
            if (fenceChar === null)
                fenceChar = c; // open
            else if (fenceChar === c)
                fenceChar = null; // close — same char only
            // else: the other fence char inside an open fence → stays in-fence
            continue;
        }
        if (fenceChar !== null)
            continue; // inside a fence
        yield { index: i, text: line };
    }
}
/**
 * `md` with all fenced regions (and their delimiters) removed, for fence-aware field extraction —
 * so a `**Origin:**`-style label inside a prose example cannot satisfy a required-field check.
 */
export function stripFencedBlocks(md) {
    return [...contentLines(md)].map((l) => l.text).join("\n");
}
//# sourceMappingURL=_markdown.js.map