// The delivery memory's store: one JSONL file under the workspace state
// directory. It is derived from the handover issues, so deleting it loses
// nothing. It sits in the workspace where anything with write access could edit
// it, so a read checks the file's structure and each note's text again and
// refuses the whole file on one bad line. The text check matches secrets that
// sit unbroken in a note, and the read cannot tell who wrote a line.
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { hasControl } from "../handovers/controls.js";
import { writeStateFile } from "../validate/cache-file.js";
import { isWrittenDate } from "../validate/written-date.js";
import { NOTE_KINDS, NOTE_LIMITS } from "./notes.js";
import { secretTypesIn } from "./screen.js";
// A read holds the whole file in memory, up to `bytes`, and checks every note, so both are bounded.
export const STORE_LIMITS = { notes: 20_000, bytes: 8 * 1024 * 1024 };
export const FORMAT = 2;
const MAX_ISSUES = 100;
const FILE = "notes.jsonl";
export const memoryDir = (ws) => join(ws, `.${resolveBrandSlugSync()}`, "memory");
const isPosInt = (v) => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
function toMeta(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
        return null;
    const o = raw;
    if (o["3c-memory"] !== FORMAT)
        return null;
    const { repo, syncedAt } = o;
    if (repo !== null && (typeof repo !== "string" || !REPO.test(repo)))
        return null;
    if (!isWrittenDate(syncedAt))
        return null;
    return { repo, syncedAt };
}
export async function writeStore(ws, store, limits = STORE_LIMITS) {
    if (store.notes.length > limits.notes) {
        return { ok: false, cap: "notes", count: store.notes.length, limit: limits.notes };
    }
    const header = { "3c-memory": FORMAT, repo: store.meta.repo, syncedAt: store.meta.syncedAt };
    // A header the reader would refuse must not be written: the store would be refused for ever.
    if (toMeta(header) === null)
        throw new Error("the store header is not valid");
    const text = [header, ...store.notes].map((o) => JSON.stringify(o)).join("\n") + "\n";
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > limits.bytes)
        return { ok: false, cap: "bytes", count: bytes, limit: limits.bytes };
    const dir = memoryDir(ws);
    // The directory ignores itself: `.3c/` is not gitignored by default.
    await writeStateFile(dir, ".gitignore", "*\n");
    await writeStateFile(dir, FILE, text);
    return { ok: true, bytes };
}
function toNote(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
        return null;
    const o = raw;
    const { id, handover, issues, kind, text } = o;
    if (typeof id !== "string" || id.length > 40 || hasControl(id))
        return null;
    if (!isPosInt(handover))
        return null;
    if (!Array.isArray(issues) || issues.length > MAX_ISSUES || !issues.every(isPosInt))
        return null;
    if (typeof kind !== "string" || !NOTE_KINDS.has(kind))
        return null;
    if (typeof text !== "string" || text.length > NOTE_LIMITS.chars)
        return null;
    return { id, handover, issues: [...issues], kind: kind, text };
}
/** What `path` is, without following a link: missing, a real directory or file, a link, or unreadable. */
async function inspect(path) {
    try {
        const st = await lstat(path);
        if (st.isSymbolicLink())
            return "link";
        return st.isDirectory() ? "plain-directory" : st.isFile() ? "plain-file" : "unreadable";
    }
    catch (e) {
        return e.code === "ENOENT" ? "missing" : "unreadable";
    }
}
export async function readStore(ws, limits = STORE_LIMITS) {
    const dir = memoryDir(ws);
    for (const d of [dirname(dir), dir]) {
        const state = await inspect(d);
        if (state === "missing")
            return { kind: "absent" };
        if (state !== "plain-directory") {
            return { kind: "refused", reason: `${basename(d)} is ${state === "link" ? "a link" : "not a readable directory"}` };
        }
    }
    const file = join(dir, FILE);
    // O_NOFOLLOW is not defined on every platform, so the final component is checked here as well.
    const state = await inspect(file);
    if (state === "missing")
        return { kind: "absent" };
    if (state !== "plain-file")
        return { kind: "refused", reason: `${FILE} is ${state === "link" ? "a link" : "not a readable file"}` };
    let fh;
    try {
        // lstat and open are separate calls, so O_NOFOLLOW is what refuses a link swapped in between where the
        // platform has it; Windows has no such flag, so that window stays there.
        fh = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    }
    catch {
        return { kind: "refused", reason: `${FILE} cannot be opened` };
    }
    try {
        const st = await fh.stat();
        if (!st.isFile())
            return { kind: "refused", reason: `${FILE} is not a file` };
        if (st.size > limits.bytes)
            return { kind: "refused", reason: `${FILE} is over the ${limits.bytes} byte limit` };
        const buf = Buffer.alloc(st.size);
        const { bytesRead } = await fh.read(buf, 0, st.size, 0);
        // Split on \n only: JSON.stringify leaves U+2028 and U+2029 raw, and a reader that splits on them tears a note.
        const lines = buf.subarray(0, bytesRead).toString("utf8").split("\n");
        if (lines.at(-1) === "")
            lines.pop();
        let meta = null;
        const notes = [];
        for (const [i, line] of lines.entries()) {
            const no = i + 1;
            let raw;
            try {
                raw = JSON.parse(line);
            }
            catch {
                return { kind: "refused", reason: `line ${no} is not valid JSON` };
            }
            if (i === 0) {
                meta = toMeta(raw);
                if (meta === null)
                    return { kind: "refused", reason: "the header is missing or from another version" };
                continue;
            }
            if (notes.length >= limits.notes)
                return { kind: "refused", reason: `more than ${limits.notes} notes` };
            const note = toNote(raw);
            if (note === null)
                return { kind: "refused", reason: `line ${no} is not a valid note` };
            if (hasControl(note.text))
                return { kind: "refused", reason: `line ${no} holds a control character` };
            if (secretTypesIn(note.text).length > 0)
                return { kind: "refused", reason: `line ${no} matches a secret pattern` };
            notes.push(note);
        }
        if (meta === null)
            return { kind: "refused", reason: "the header is missing or from another version" };
        return { kind: "found", store: { meta, notes } };
    }
    catch {
        return { kind: "refused", reason: `${FILE} cannot be read` };
    }
    finally {
        await fh.close();
    }
}
//# sourceMappingURL=store.js.map