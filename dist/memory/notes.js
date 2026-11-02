// Splits a handover body into notes: one per bullet, numbered item or paragraph
// under a section the memory knows. Anything else, fenced code and the
// metadata block included, is left out. A note is the unit that gets screened for
// secrets, so text split across two bullets or paragraphs is two notes.
export const NOTE_KINDS = new Set(["change", "lesson", "decision", "follow-up", "open"]);
// A note is one line of advice, not a document; a longer piece is refused, not cut.
export const NOTE_LIMITS = { chars: 600 };
const SECTIONS = new Map([
    ["what changed", "change"],
    ["lessons", "lesson"],
    ["decisions", "decision"],
    ["follow-ups", "follow-up"],
    ["needs a human", "open"],
]);
const ITEM = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/;
// A fence may open inside a list item or a quote, and an opener may carry an info string.
const OPENER = /^[ \t>]*(?:(?:[-*]|\d+[.)])[ \t]+)?(`{3,}|~{3,})/;
// A closer is the run alone: a line with an info string opens a nested block in CommonMark and closes nothing.
const CLOSER = /^[ \t>]*(`{3,}|~{3,})[ \t]*$/;
const HEADING = /^#{1,6}\s+(.*)$/;
// Every run of lines is screened, which grows with the square of the line count, so a note wrapped over more
// lines than this is refused.
const MAX_LINES = 40;
// Whitespace other than a space or a tab (a no-break space, a line separator) is turned into a plain space when
// a note is built, which would hide it from the secret screen, so a note holding any is refused instead.
const EXOTIC_SPACE = /[^\S \t]/;
// Linear in the heading's length: trim first, then match one separator, so a long run of spaces costs nothing extra.
const headingName = (text) => text.trimEnd().replace(/\s#+$/, "").replace(/:$/, "").trim().toLowerCase();
export function splitNotes(handover, issues, body) {
    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const notes = [];
    const wrapped = [];
    const refused = { fenced: 0, long: 0, control: 0, wrapped: 0, unclosed: 0 };
    let kind = null;
    let pending = [];
    let open = null;
    let skipped = 0;
    const flush = () => {
        if (pending.length === 0)
            return;
        const text = pending.join(" ").replace(/\s+/g, " ").trim();
        const lines = pending;
        const pieces = lines.map((p) => p.trim()).filter((p) => p !== "");
        pending = [];
        if (kind === null || text === "")
            return;
        if (lines.some((p) => EXOTIC_SPACE.test(p))) {
            refused.control++;
            return;
        }
        if (text.length > NOTE_LIMITS.chars) {
            refused.long++;
            return;
        }
        if (pieces.length > MAX_LINES) {
            refused.wrapped++;
            return;
        }
        notes.push({ id: `${handover}:${notes.length}`, handover, issues, kind, text });
        const runs = [];
        for (let i = 0; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++)
                runs.push(pieces.slice(i, j + 1).join(""));
        }
        wrapped.push(runs);
    };
    for (const line of lines) {
        if (open !== null) {
            const closer = CLOSER.exec(line)?.[1];
            if (closer !== undefined && closer[0] === open.char && closer.length >= open.length)
                open = null;
            else if (line.trim() !== "")
                skipped++;
            continue;
        }
        const opener = OPENER.exec(line)?.[1];
        if (opener !== undefined) {
            flush();
            if (kind !== null)
                refused.fenced++;
            open = { char: opener[0], length: opener.length, counted: kind !== null };
            skipped = 0;
            continue;
        }
        const heading = HEADING.exec(line);
        if (heading !== null) {
            flush();
            kind = SECTIONS.get(headingName(heading[1])) ?? null;
            continue;
        }
        if (line.trim() === "") {
            flush();
            continue;
        }
        const item = ITEM.exec(line);
        if (item !== null) {
            flush();
            pending.push(item[1]);
        }
        else
            pending.push(line);
    }
    flush();
    if (open !== null && open.counted)
        refused.unclosed = skipped;
    return { notes, wrapped, refused };
}
//# sourceMappingURL=notes.js.map