// #301: the handover document is the machine-readable delivery artefact.
// Parses the `3c-handover/1` YAML frontmatter the ship stage writes into
// docs/Handover-N.md. Strictly validated (CWE-20: malformed input is rejected,
// never coerced); js-yaml v4 `load` is safe by default (no code-exec tags).
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
// CWE-400: a handover is a small text document; anything beyond this is not
// a parseable artefact and is counted malformed without being read.
const MAX_HANDOVER_BYTES = 1_048_576;
export const HANDOVER_SCHEMA = "3c-handover/1";
const FILE_RE = /^Handover-(\d+)\.md$/;
const isPosInt = (v) => typeof v === "number" && Number.isInteger(v) && v > 0;
const isCount = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isDateString = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isString = (v) => typeof v === "string";
function readIssues(fm) {
    const hasOne = "issue" in fm;
    const hasMany = "issues" in fm;
    if (hasOne === hasMany)
        return null; // exactly one form, never both/neither
    if (hasOne)
        return isPosInt(fm["issue"]) ? [fm["issue"]] : null;
    const many = fm["issues"];
    return Array.isArray(many) && many.length > 0 && many.every(isPosInt)
        ? [...many]
        : null;
}
function readVerdict(v) {
    if (v === undefined)
        return undefined;
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return null;
    const o = v;
    if (o["level"] !== undefined && typeof o["level"] !== "string")
        return null;
    for (const k of ["blocking", "warnings", "suggestions", "fixed_in_branch"]) {
        if (o[k] !== undefined && !isCount(o[k]))
            return null;
    }
    return o;
}
function readLoc(v) {
    if (v === undefined)
        return undefined;
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return null;
    const o = v;
    for (const k of ["added", "removed", "files"]) {
        if (o[k] !== undefined && !isCount(o[k]))
            return null;
    }
    return o;
}
export function parseHandover(fileName, content) {
    const m = FILE_RE.exec(fileName);
    if (!m)
        return { kind: "malformed", reason: "file name is not Handover-N.md" };
    const handover = Number(m[1]);
    const text = content.replace(/\r\n/g, "\n");
    if (!text.startsWith("---\n"))
        return { kind: "legacy" };
    // Line-anchored close fence: exactly `---` on its own line, so `----`,
    // `---junk`, or a `---` embedded mid-line can never terminate the block.
    const close = /\n---[ \t]*(?:\n|$)/.exec(text.slice(3));
    if (close === null) {
        return { kind: "malformed", reason: "unterminated frontmatter" };
    }
    let fm;
    try {
        // JSON_SCHEMA: only JSON-shaped scalars — no custom tags, and unquoted
        // ISO timestamps stay strings instead of becoming Date objects.
        fm = yaml.load(text.slice(4, 3 + close.index), { schema: yaml.JSON_SCHEMA });
    }
    catch {
        return { kind: "malformed", reason: "frontmatter is not valid YAML" };
    }
    if (typeof fm !== "object" || fm === null || Array.isArray(fm)) {
        return { kind: "malformed", reason: "frontmatter is not a mapping" };
    }
    const o = fm;
    if (o["schema"] !== HANDOVER_SCHEMA) {
        return { kind: "malformed", reason: `schema is not ${HANDOVER_SCHEMA}` };
    }
    const issues = readIssues(o);
    if (issues === null) {
        return { kind: "malformed", reason: "exactly one of issue/issues required" };
    }
    for (const [k, ok] of [
        ["title", o["title"] === undefined || typeof o["title"] === "string"],
        ["pr", o["pr"] === undefined || isPosInt(o["pr"])],
        ["merge_sha", o["merge_sha"] === undefined || typeof o["merge_sha"] === "string"],
        ["branch", o["branch"] === undefined || typeof o["branch"] === "string"],
        ["started", o["started"] === undefined || isDateString(o["started"])],
        ["merged", o["merged"] === undefined || isDateString(o["merged"])],
        ["tests_total", o["tests_total"] === undefined || isCount(o["tests_total"])],
        [
            "follow_ups",
            o["follow_ups"] === undefined ||
                (Array.isArray(o["follow_ups"]) && o["follow_ups"].every(isPosInt)),
        ],
        // #307 AC6: gates_fired is metadata-only — an array of gate-name strings, never raw
        // command output or env values that could carry secrets (binding constraint #1).
        [
            "gates_fired",
            o["gates_fired"] === undefined ||
                (Array.isArray(o["gates_fired"]) && o["gates_fired"].every(isString)),
        ],
    ]) {
        if (!ok)
            return { kind: "malformed", reason: `invalid field: ${k}` };
    }
    const verdict = readVerdict(o["verdict"]);
    if (verdict === null)
        return { kind: "malformed", reason: "invalid field: verdict" };
    const loc = readLoc(o["loc"]);
    if (loc === null)
        return { kind: "malformed", reason: "invalid field: loc" };
    return {
        kind: "record",
        record: {
            handover,
            issues,
            title: o["title"],
            pr: o["pr"],
            merge_sha: o["merge_sha"],
            branch: o["branch"],
            started: o["started"],
            merged: o["merged"],
            verdict,
            tests_total: o["tests_total"],
            loc,
            follow_ups: o["follow_ups"] ?? [],
            gates_fired: o["gates_fired"],
        },
    };
}
// Scans a docs directory for Handover-N.md files. A missing directory is an
// empty scan, not an error — the dashboard must never crash on legacy state.
export async function readHandovers(docsDir) {
    let names;
    try {
        names = await readdir(docsDir);
    }
    catch {
        return { records: [], legacy: 0, malformed: 0 };
    }
    const records = [];
    let legacy = 0;
    let malformed = 0;
    for (const name of names.filter((n) => FILE_RE.test(n))) {
        const path = join(docsDir, name);
        // #317: one unreadable entry (deleted between readdir and read, a permission error, or a
        // same-named directory) is counted malformed, not allowed to reject the whole scan — the
        // dashboard must never crash on legacy/odd state.
        try {
            if ((await stat(path)).size > MAX_HANDOVER_BYTES) {
                malformed++;
                continue;
            }
            const parsed = parseHandover(name, await readFile(path, "utf8"));
            if (parsed.kind === "record")
                records.push(parsed.record);
            else if (parsed.kind === "legacy")
                legacy++;
            else
                malformed++;
        }
        catch {
            malformed++;
        }
    }
    return { records, legacy, malformed };
}
//# sourceMappingURL=handover.js.map