// Shared so the markdown validators cannot diverge on which line closes a fence.
/** Larger input fails closed (CWE-400). */
export const MAX_DOC_BYTES = 1_048_576;
/** Measured in UTF-8 bytes, matching MAX_HANDOVER_BYTES. */
export function exceedsSizeCap(md) {
    return Buffer.byteLength(md, "utf8") > MAX_DOC_BYTES;
}
/** null when the line is not a fence delimiter. */
export function fenceCharOf(line) {
    const m = line.trimStart();
    if (m.startsWith("```"))
        return "`";
    if (m.startsWith("~~~"))
        return "~";
    return null;
}
/**
 * Lines outside fences, with 0-based index so callers can slice the source. CommonMark: only the
 * opening char closes a fence; an unterminated fence swallows the rest.
 */
export function* contentLines(md) {
    const lines = md.split(/\r?\n/);
    let fenceChar = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined)
            continue;
        const c = fenceCharOf(line);
        if (c !== null) {
            if (fenceChar === null)
                fenceChar = c;
            else if (fenceChar === c)
                fenceChar = null;
            continue;
        }
        if (fenceChar !== null)
            continue;
        yield { index: i, text: line };
    }
}
/** So a `**Origin:**`-style label inside a fenced example cannot satisfy a required-field check. */
export function stripFencedBlocks(md) {
    return [...contentLines(md)].map((l) => l.text).join("\n");
}
//# sourceMappingURL=_markdown.js.map