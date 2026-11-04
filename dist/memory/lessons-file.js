// Reads and checks the committed lessons file, `.3c/lessons.yaml`: stored search rules over the notes, minus the
// handovers a person has read and left out. The file is changed by pull request, so it is input from a branch: it is
// bounded before it is parsed, checked field by field, and refused whole on the first problem. A refusal names the
// place (`lesson 3, terms`) and the rule broken, and never a value from the file.
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { hasControl } from "../handovers/controls.js";
import { isSearchTerm } from "./brief-rank.js";
import { secretTypesIn } from "./screen.js";
export const LESSON_LIMITS = { bytes: 64 * 1024, lessons: 50, terms: 8, term: 40, exclusions: 100, title: 100, reason: 200 };
/** The file's path from the workspace root, in the form git and a reader of the output know it. */
export const lessonsRelPath = () => `.${resolveBrandSlugSync()}/lessons.yaml`;
export const lessonsPath = (ws) => join(ws, `.${resolveBrandSlugSync()}`, "lessons.yaml");
const refuse = (where, why) => ({ kind: "refused", where, why });
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const hasOnly = (o, keys) => Object.keys(o).every((k) => keys.includes(k));
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Why free text may not be shown, or null: text is printed, so control characters and secrets are refused. */
function unsafeText(text) {
    if (hasControl(text))
        return "holds a control or invisible character";
    return secretTypesIn(text).length > 0 ? "matches a secret pattern" : null;
}
function checkText(value, where, max) {
    if (typeof value !== "string" || value.trim() === "")
        return refuse(where, "is missing, empty or not text");
    if (value.length > max)
        return refuse(where, `is over ${max} characters`);
    const unsafe = unsafeText(value);
    return unsafe === null ? value : refuse(where, unsafe);
}
function checkExclusions(raw, at) {
    if (raw === undefined || raw === null)
        return [];
    if (!Array.isArray(raw))
        return refuse(`${at}, exclusions`, "is not a list");
    if (raw.length > LESSON_LIMITS.exclusions)
        return refuse(`${at}, exclusions`, `holds more than ${LESSON_LIMITS.exclusions} entries`);
    const out = [];
    const seen = new Set();
    for (const [i, entry] of raw.entries()) {
        const where = `${at}, exclusion ${i + 1}`;
        if (!isObject(entry) || !hasOnly(entry, ["handover", "reason"]))
            return refuse(where, "is not a handover and a reason");
        const { handover } = entry;
        if (typeof handover !== "number" || !Number.isSafeInteger(handover) || handover < 1)
            return refuse(`${where}, handover`, "is not a whole number above 0");
        if (seen.has(handover))
            return refuse(`${where}, handover`, "repeats an earlier exclusion");
        seen.add(handover);
        const reason = checkText(entry["reason"], `${where}, reason`, LESSON_LIMITS.reason);
        if (typeof reason !== "string")
            return reason;
        out.push({ handover, reason });
    }
    return out;
}
function checkTerms(raw, at) {
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > LESSON_LIMITS.terms)
        return refuse(`${at}, terms`, `is not a list of 1 to ${LESSON_LIMITS.terms} terms`);
    for (const [i, term] of raw.entries()) {
        if (typeof term !== "string" || term.length > LESSON_LIMITS.term || !isSearchTerm(term) || unsafeText(term) !== null) {
            return refuse(`${at}, term ${i + 1}`, `is not a lowercase word of 4 to ${LESSON_LIMITS.term} letters, digits or hyphens that notes can match`);
        }
        if (raw.indexOf(term) !== i)
            return refuse(`${at}, term ${i + 1}`, "repeats an earlier term");
    }
    return raw;
}
function checkLesson(raw, index, ids) {
    const at = `lesson ${index + 1}`;
    if (!isObject(raw))
        return refuse(at, "is not a list entry with an id, a title, terms and exclusions");
    if (!hasOnly(raw, ["id", "title", "terms", "exclusions"]))
        return refuse(at, "holds a field other than id, title, terms and exclusions");
    const { id } = raw;
    if (typeof id !== "string" || !ID.test(id))
        return refuse(`${at}, id`, "is not a lowercase word of up to 40 letters, digits or hyphens");
    if (ids.has(id))
        return refuse(`${at}, id`, "repeats an earlier lesson");
    ids.add(id);
    const title = checkText(raw["title"], `${at}, title`, LESSON_LIMITS.title);
    if (typeof title !== "string")
        return title;
    const terms = checkTerms(raw["terms"], at);
    if (!Array.isArray(terms))
        return terms;
    const exclusions = checkExclusions(raw["exclusions"], at);
    if (!Array.isArray(exclusions))
        return exclusions;
    return { id, title, terms, exclusions };
}
/** The lessons in the text of a file, or why the whole file is refused. The caller has already bounded the text. */
export function parseLessons(text) {
    let doc;
    try {
        doc = yaml.load(text, { schema: yaml.JSON_SCHEMA });
    }
    catch (e) {
        // The parser's own message quotes the text of the file; its line number is only a number.
        const line = e.mark?.line;
        return refuse("the file", typeof line === "number" ? `is not valid YAML (line ${line + 1})` : "is not valid YAML");
    }
    if (doc === undefined || doc === null)
        return { kind: "empty" };
    if (!isObject(doc) || !hasOnly(doc, ["lessons"]))
        return refuse("the file", "holds a field other than lessons");
    const list = doc["lessons"];
    if (list === undefined || list === null)
        return { kind: "empty" };
    if (!Array.isArray(list))
        return refuse("the file", "has lessons that are not a list");
    if (list.length === 0)
        return { kind: "empty" };
    if (list.length > LESSON_LIMITS.lessons)
        return refuse("the file", `holds more than ${LESSON_LIMITS.lessons} lessons`);
    const ids = new Set();
    const lessons = [];
    for (const [i, raw] of list.entries()) {
        const lesson = checkLesson(raw, i, ids);
        if ("kind" in lesson)
            return lesson;
        lessons.push(lesson);
    }
    return { kind: "found", lessons };
}
/** The lessons file of a workspace: absent, empty, refused with the reason, or found. It only reads. */
export async function readLessons(ws, bytes = LESSON_LIMITS.bytes) {
    const path = lessonsPath(ws);
    try {
        const st = await lstat(path);
        if (st.isSymbolicLink())
            return refuse("the file", "is a link");
        if (!st.isFile())
            return refuse("the file", "is not a readable file");
    }
    catch (e) {
        return e.code === "ENOENT" ? { kind: "absent" } : refuse("the file", "cannot be read");
    }
    let fh;
    try {
        fh = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    }
    catch {
        return refuse("the file", "cannot be opened");
    }
    try {
        const st = await fh.stat();
        if (!st.isFile())
            return refuse("the file", "is not a readable file");
        if (st.size > bytes)
            return refuse("the file", `is over ${bytes / 1024} KiB`);
        const buf = Buffer.alloc(st.size);
        const { bytesRead } = await fh.read(buf, 0, st.size, 0);
        return parseLessons(buf.subarray(0, bytesRead).toString("utf8"));
    }
    catch {
        return refuse("the file", "cannot be read");
    }
    finally {
        await fh.close();
    }
}
//# sourceMappingURL=lessons-file.js.map