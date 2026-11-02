// What a brief reads out of an issue body: the ruling, the criteria and the files it names. The body is text
// from an author, so each reader takes lines it can recognise and nothing else.
const MAX_DECIDED = 5;
const MAX_CRITERIA = 20;
const MAX_FILES = 20;
const MAX_LINE = 400;
const OPENER = /^\s*(?:[-*+]\s+|\d{1,9}[.)]\s+)?(`{3,}|~{3,})/;
// A closer is the run alone: a line with an info string opens a nested block and closes nothing.
const CLOSER = /^\s*(`{3,}|~{3,})\s*$/;
const HEADING = /^#{1,6}\s+(.*)$/;
const DECISION_HEADING = /^decision\s*:?$/i;
// A line that is itself a ruling: "Decision: …", "Owner decision (2026-10-25): …", with an optional bullet or bold.
const DECISION_LINE = /^(?:[-*]\s+)?(?:\*\*)?(?:owner\s+)?decision(?:\s*\([^)]*\))?(?:\*\*)?\s*:/i;
// Applied to a trimmed line, so a long run of spaces cannot make the match backtrack.
const CRITERION = /^[-*]\s+\[[ xX]\]\s+(\S.*)$/;
const FILE = /(?<![\w./-])((?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]*[A-Za-z0-9_-]\.[A-Za-z0-9]+)(?![\w/-])/g;
/** Lines of `body` outside fenced code, so a quoted example is never read as a ruling or a criterion. */
function proseLines(body) {
    const out = [];
    let open = null;
    for (const line of body.split(/\r\n|\r|\n/)) {
        if (open !== null) {
            const closer = CLOSER.exec(line)?.[1];
            if (closer !== undefined && closer[0] === open.char && closer.length >= open.length)
                open = null;
            continue;
        }
        const opener = OPENER.exec(line)?.[1];
        if (opener !== undefined) {
            open = { char: opener[0], length: opener.length };
            continue;
        }
        out.push(line);
    }
    return out;
}
const unbullet = (line) => line.trim().replace(/^[-*]\s+/, "").replace(/^\*\*(.*?)\*\*/, "$1").trim();
/**
 * The first block of lines under a Decision heading, and any line that opens with a Decision marker, in order,
 * without repeats. The heading alone sets a block apart as a ruling; the block ends at the first blank line after a
 * ruling line, or at the next heading. A checkbox is a criterion and never a ruling.
 */
export function extractDecided(body) {
    const found = [];
    let inSection = false;
    let taken = false;
    for (const line of proseLines(body)) {
        const heading = HEADING.exec(line);
        if (heading !== null) {
            inSection = DECISION_HEADING.test(heading[1].trim());
            taken = false;
            continue;
        }
        const text = unbullet(line);
        if (text === "") {
            if (taken)
                inSection = false;
            continue;
        }
        if (text.length > MAX_LINE || CRITERION.test(line.trim()))
            continue;
        if (inSection || DECISION_LINE.test(line.trim())) {
            taken = true;
            if (!found.includes(text))
                found.push(text);
        }
    }
    return found.slice(0, MAX_DECIDED);
}
/** The date a ruling line carries before its colon ("Owner decision (2026-10-25): …"), or null; a date in the text is not the ruling's. */
export function rulingDate(line) {
    const colon = line.indexOf(":");
    return colon < 0 ? null : (/\d{4}-\d{2}-\d{2}/.exec(line.slice(0, colon))?.[0] ?? null);
}
/** The acceptance criteria: every checkbox line. */
export function extractCriteria(body) {
    const found = [];
    for (const line of proseLines(body)) {
        const text = CRITERION.exec(line.trim())?.[1];
        if (text !== undefined && text.length <= MAX_LINE)
            found.push(text);
    }
    return found.slice(0, MAX_CRITERIA);
}
/**
 * Whether `path` may reach the command line and the filesystem: relative, inside the repository, no `..` anywhere,
 * no option-looking segment, no pathspec magic, no glob, no drive or backslash, and nothing a terminal would act on
 * (CWE-22, CWE-88).
 */
export function isSafePath(path) {
    if (path === "" || path.length > 200 || path.includes(".."))
        return false;
    if (path.startsWith("/") || path.startsWith(":") || /^[A-Za-z]:/.test(path))
        return false;
    if (/[\\*?[\]{}~$`;&|<>"'\s]/.test(path))
        return false;
    if ([...path].some((ch) => (ch.codePointAt(0) ?? 0) < 0x20 || (ch.codePointAt(0) ?? 0) === 0x7f))
        return false;
    return path.split("/").every((segment) => segment !== "" && segment !== "." && !segment.startsWith("-"));
}
/** The repository files `text` names, safe to hand to git, in order of first mention, without repeats. */
export function extractFiles(...texts) {
    const found = [];
    for (const text of texts) {
        for (const match of text.matchAll(FILE)) {
            const path = match[1];
            if (isSafePath(path) && !found.includes(path))
                found.push(path);
        }
    }
    return found.slice(0, MAX_FILES);
}
/** Whether `text` names `path` as a whole path, not as the tail or the start of a longer one. */
export function mentionsPath(text, path) {
    for (let at = text.indexOf(path); at >= 0; at = text.indexOf(path, at + 1)) {
        const before = text[at - 1];
        const after = text[at + path.length];
        if ((before === undefined || !/[\w./-]/.test(before)) && (after === undefined || !/[\w/-]/.test(after)))
            return true;
    }
    return false;
}
/** Whether `text` mentions issue `n` as `#n` and not as the start of a longer number. */
export function mentionsIssue(text, n) {
    return new RegExp(`(?:^|[^\\w])#${n}(?!\\d)`).test(text);
}
/** Every issue number `text` mentions as `#n`. */
export function issueRefs(text) {
    const refs = new Set();
    for (const match of text.matchAll(/(?:^|[^\w])#(\d{1,9})(?!\d)/g))
        refs.add(Number(match[1]));
    return [...refs];
}
//# sourceMappingURL=brief-text.js.map