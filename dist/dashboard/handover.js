// The handover document is the machine-readable delivery artefact.
// Parses the `3c-handover/1` YAML frontmatter the ship stage writes. Its
// author can be anyone able to open an issue, so it is validated strictly
// (CWE-20: malformed input is rejected, never coerced or truncated) and the
// record is rebuilt from known fields only.
import * as yaml from "js-yaml";
// CWE-400: a handover is a small text document; anything larger is refused
// before it is parsed.
const MAX_FRONTMATTER_BYTES = 65_536;
const VERDICT_LEVELS = new Set(["clean", "advisory", "blocking"]);
const MAX_LEN = { title: 200, branch: 128, merge_sha: 64, gate: 64, date: 64 };
const MAX_LIST = { issues: 100, follow_ups: 100, gates_fired: 32 };
// C0 and C1 controls, DEL, the Unicode line and paragraph separators, and
// the bidi marks, embeddings, overrides and isolates: a field that renders on
// one line must not be able to break, recolour or reorder it (CWE-1007).
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
export const HANDOVER_SCHEMA = "3c-handover/1";
const isPosInt = (v) => typeof v === "number" && Number.isInteger(v) && v > 0;
const isCount = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isText = (max) => (v) => typeof v === "string" && v.length <= max && !CONTROL.test(v);
const isDateString = (v) => isText(MAX_LEN.date)(v) && !Number.isNaN(Date.parse(v));
const isList = (max, item) => (v) => Array.isArray(v) && v.length <= max && v.every(item);
function readIssues(fm) {
    const hasOne = Object.hasOwn(fm, "issue");
    const hasMany = Object.hasOwn(fm, "issues");
    if (hasOne === hasMany)
        return null; // exactly one form, never both/neither
    if (hasOne)
        return isPosInt(fm["issue"]) ? [fm["issue"]] : null;
    const many = fm["issues"];
    return isList(MAX_LIST.issues, isPosInt)(many) && many.length > 0 ? [...many] : null;
}
/** A copy holding only `keys` that pass `ok`, or null when one present key fails. */
function pick(v, keys, ok) {
    if (v === undefined)
        return undefined;
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return null;
    const src = v;
    const out = {};
    for (const k of keys) {
        if (!Object.hasOwn(src, k) || src[k] === undefined)
            continue;
        if (!ok(k, src[k]))
            return null;
        out[k] = src[k];
    }
    return out;
}
const readVerdict = (v) => pick(v, ["level", "blocking", "warnings", "suggestions", "fixed_in_branch"], (k, x) => k === "level" ? typeof x === "string" && VERDICT_LEVELS.has(x) : isCount(x));
const readLoc = (v) => pick(v, ["added", "removed", "files"], (_k, x) => isCount(x));
/** String fields whose unquoted values YAML can retype as numbers. */
const TEXT_FIELDS = ["merge_sha", "branch"];
/**
 * The field's value exactly as written on its own frontmatter line — never
 * String(number), which turns `88e7253` into "Infinity" and drops a leading
 * zero. Only a plain token (letters, digits, `._/-`) with an optional trailing
 * comment is recovered, and only when the key appears once; anything else
 * (an anchor, a flow mapping, a duplicate key) returns null and the caller
 * fails closed rather than guess. The key must sit at column 0, as the
 * template writes it — a uniformly indented root mapping is refused, by design.
 */
function rawScalar(fmText, field) {
    const re = new RegExp(`^${field}:[ \\t]*([0-9A-Za-z][0-9A-Za-z._/-]*)[ \\t]*(?:#.*)?$`, "gm");
    const hits = [...fmText.matchAll(re)];
    return hits.length === 1 ? hits[0][1] : null;
}
// The opening line of each accepted block and the line that closes it. Only a
// block at the very top counts: one further down is narrative quoting it.
const BLOCKS = [
    { open: "---\n", close: /\n---[ \t]*(?:\n|$)/ },
    { open: "```yaml\n", close: /\n```[ \t]*(?:\n|$)/ },
];
/** Parses a handover body whose metadata block opens it. */
export function parseHandoverBody(handover, body) {
    if (Buffer.byteLength(body, "utf8") > MAX_FRONTMATTER_BYTES) {
        return { kind: "malformed", reason: `body exceeds ${MAX_FRONTMATTER_BYTES} bytes` };
    }
    // GitHub can prefill a template's body with a blank line before the block.
    const text = body.replace(/\r\n/g, "\n").replace(/^(?:[ \t]*\n)+/, "");
    const block = BLOCKS.find((b) => text.startsWith(b.open));
    if (block === undefined)
        return { kind: "legacy" };
    // Line-anchored close: exactly the fence on its own line, so `----`,
    // `---junk`, or a fence embedded mid-line can never terminate the block.
    const rest = text.slice(block.open.length - 1);
    const close = block.close.exec(rest);
    if (close === null)
        return { kind: "malformed", reason: "unterminated frontmatter" };
    return validateHandoverFrontmatter(rest.slice(1, close.index), handover);
}
/** Validates the YAML between the fences, numbering the record `handover`. */
export function validateHandoverFrontmatter(fmText, handover) {
    if (Buffer.byteLength(fmText, "utf8") > MAX_FRONTMATTER_BYTES) {
        return { kind: "malformed", reason: `frontmatter exceeds ${MAX_FRONTMATTER_BYTES} bytes` };
    }
    let fm;
    let anchored = false;
    try {
        // JSON_SCHEMA: only JSON-shaped scalars — no custom tags, and unquoted
        // ISO timestamps stay strings instead of becoming Date objects. Every
        // alias needs an anchor, so refusing anchors refuses alias bombs; js-yaml
        // exposes the anchor only on its undocumented parser state, so the
        // dependency is pinned exactly and a state without the field fails closed.
        fm = yaml.load(fmText, {
            schema: yaml.JSON_SCHEMA,
            listener: (event, state) => {
                if (event !== "close")
                    return;
                if (!("anchor" in state) || state.anchor)
                    anchored = true;
            },
        });
    }
    catch {
        return { kind: "malformed", reason: "frontmatter is not valid YAML" };
    }
    if (anchored)
        return { kind: "malformed", reason: "frontmatter uses YAML anchors or aliases" };
    if (typeof fm !== "object" || fm === null || Array.isArray(fm)) {
        return { kind: "malformed", reason: "frontmatter is not a mapping" };
    }
    const o = fm;
    // A short sha or branch YAML typed as a NUMBER (`5638459`, or
    // `88e7253` — scientific notation, Infinity) keeps its original TEXT.
    for (const field of TEXT_FIELDS) {
        if (typeof o[field] !== "number")
            continue;
        const raw = rawScalar(fmText, field);
        if (raw === null)
            return { kind: "malformed", reason: `invalid field: ${field}` };
        o[field] = raw;
    }
    return validateHandoverObject(o, handover);
}
/** Validates a parsed handover mapping; the delivery cache re-checks its records with it. */
export function validateHandoverObject(fm, handover) {
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
    const checks = [
        ["title", isText(MAX_LEN.title)],
        ["pr", isPosInt],
        ["merge_sha", isText(MAX_LEN.merge_sha)],
        ["branch", isText(MAX_LEN.branch)],
        ["started", isDateString],
        ["merged", isDateString],
        ["tests_total", isCount],
        ["follow_ups", isList(MAX_LIST.follow_ups, isPosInt)],
        // Gate names only, never command output or env values that could carry secrets.
        ["gates_fired", isList(MAX_LIST.gates_fired, isText(MAX_LEN.gate))],
    ];
    for (const [k, ok] of checks) {
        if (Object.hasOwn(o, k) && o[k] !== undefined && !ok(o[k])) {
            return { kind: "malformed", reason: `invalid field: ${k}` };
        }
    }
    const verdict = readVerdict(o["verdict"]);
    if (verdict === null)
        return { kind: "malformed", reason: "invalid field: verdict" };
    const loc = readLoc(o["loc"]);
    if (loc === null)
        return { kind: "malformed", reason: "invalid field: loc" };
    const own = (k) => (Object.hasOwn(o, k) ? o[k] : undefined);
    const gates = own("gates_fired");
    return {
        kind: "record",
        record: {
            handover,
            issues,
            title: own("title"),
            pr: own("pr"),
            merge_sha: own("merge_sha"),
            branch: own("branch"),
            started: own("started"),
            merged: own("merged"),
            verdict,
            tests_total: own("tests_total"),
            loc,
            follow_ups: [...(own("follow_ups") ?? [])],
            gates_fired: gates === undefined ? undefined : [...gates],
        },
    };
}
//# sourceMappingURL=handover.js.map