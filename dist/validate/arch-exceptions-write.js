// The WRITE path of the architecture waiver store, kept out of
// arch-exceptions.ts so the module the post-edit hook loads on every edit
// carries no writer. Only the CLI imports this.
//
// Recording a waiver must not damage the waivers already there:
//  - a SHAPE-invalid entry (`expiry:` for `expires:`, an unquoted `2099`)
//    parses fine but is dropped by the shared reader filter, so a rewrite
//    would leave it out at exit 0 — the writer refuses instead;
//  - an entry keeps the adopter's own keys (`owner:` / `ticket:`), rather
//    than being rebuilt as exactly {reason, expires};
//  - the file is never written through whatever sits at its path — a
//    symlink, dangling or not, would carry it out of `.3c/` (CWE-59) — nor
//    in place, where an interrupted write would leave a truncated store.
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { basename, dirname, join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { clampLabel, loadArchConfig } from "./arch-config.js";
import { exceptionsFile, MAX_EXCEPTIONS_BYTES } from "./arch-exceptions.js";
const linkRefusal = (path, noun) => `${path} is a symbolic link — refusing to write the waiver store through it. ` +
    `Replace it with a real ${noun} (move the target's content into place), then re-run \`except\`.`;
/** What a YAML value actually is, in words — `typeof null` is "object". */
function found(v) {
    if (v === null)
        return "an empty value";
    if (Array.isArray(v))
        return "a list";
    if (typeof v === "number" || typeof v === "boolean")
        return `the ${typeof v} ${String(v)}`;
    return `a ${typeof v}`;
}
/** The line to write — a template the adopter fills in, never a date invented from what they typed. */
const EXPIRES_LINE = 'expires: "YYYY-MM-DD"';
/** Why an entry would be skipped by the readers — in words that say what to write instead. */
function shapeProblem(key, v) {
    const name = `entry "${clampLabel(key)}"`;
    if (!v || typeof v !== "object" || Array.isArray(v)) {
        return `${name} must be a mapping with a string \`reason\` and a string \`expires\`, found ${found(v)}`;
    }
    const e = v;
    if (typeof e.reason !== "string") {
        if (e.reason !== undefined)
            return `${name}: \`reason\` must be text, found ${found(e.reason)}`;
        return `${name} has no string \`reason\`` + ("reasons" in e ? " — did you mean `reason` instead of `reasons`?" : "");
    }
    if (e.expires === undefined) {
        const near = ["expiry", "expire", "expiration", "expires_at"].find((k) => k in e);
        return `${name} has no \`expires\`` + (near ? ` — did you mean \`expires\` instead of \`${near}\`?` : "");
    }
    if (e.expires === null) {
        return `${name}: \`expires\` is empty — add a quoted date you choose, e.g. ${EXPIRES_LINE}`;
    }
    if (typeof e.expires !== "string") {
        // Never build the date from what was typed: a pasted "2099-12-31" would
        // grant a waiver until a date nobody chose.
        return (`${name}: \`expires\` must be a quoted date string, found ${found(e.expires)} ` +
            `— write a quoted ISO date you choose, e.g. ${EXPIRES_LINE}`);
    }
    return null;
}
/**
 * The writer's read: refuses rather than drops. Returns the raw entries —
 * every key on every entry — so the rewrite can keep what it did not author.
 */
async function loadStoreStrict(f) {
    // lstat BEFORE anything else, on the directory and the file: `stat` follows
    // a link, and a DANGLING one read as ENOENT — "absent is not broken" —
    // after which writeFile followed it out of `.3c/`.
    const dir = dirname(f);
    const d = await lstat(dir).catch((e) => {
        if (e.code === "ENOENT")
            return null;
        throw new Error(`${dir} could not be inspected (${e.code ?? "error"})`);
    });
    if (d?.isSymbolicLink())
        throw new Error(linkRefusal(dir, "directory"));
    const st = await lstat(f).catch((e) => {
        if (e.code === "ENOENT")
            return null; // absent is not broken
        throw new Error(`${f} exists but could not be read`);
    });
    if (st === null)
        return {};
    if (st.isSymbolicLink())
        throw new Error(linkRefusal(f, "file"));
    if (!st.isFile() || st.size > MAX_EXCEPTIONS_BYTES) {
        throw new Error(`${f} is not a readable file within the size limit`);
    }
    const text = await readFile(f, "utf8");
    let raw;
    try {
        raw = yaml.load(text, { schema: yaml.JSON_SCHEMA });
    }
    catch (e) {
        throw new Error(`${f} does not parse (${e.reason ?? "YAML error"}) — ` +
            `fix it by hand; recording a new exception would overwrite the ones already there`);
    }
    if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) {
        throw new Error(`${f} is not a mapping`);
    }
    // Object.create(null): the keys are adopter YAML, and `__proto__:` must
    // stay a key, not become the prototype (see entriesOf in the reader).
    const out = Object.create(null);
    for (const [k, v] of Object.entries((raw ?? {}))) {
        if (k === "schema_version")
            continue;
        const problem = shapeProblem(k, v);
        if (problem !== null) {
            throw new Error(`${f}: ${problem}. Fix that entry by hand — recording a new exception now would drop it.`);
        }
        out[k] = { ...v };
    }
    return out;
}
/**
 * Temp file + rename (AC8): an interrupted write leaves the old store whole,
 * and a rename replaces whatever sits at the path — a link placed after the
 * lstat above is replaced, never followed.
 */
async function writeStoreAtomically(f, text) {
    const dir = dirname(f);
    await mkdir(dir, { recursive: true });
    const tmp = join(dir, `.${basename(f)}.${randomBytes(6).toString("hex")}.tmp`);
    try {
        await writeFile(tmp, text, { encoding: "utf8", flag: "wx" });
        // Re-checked at the point of use (CWE-367): `.3c` swapped for a link
        // after the first lstat would carry the rename into the link's target.
        // A residual window remains between this and the rename; closing it needs
        // a directory handle Node does not expose portably.
        if ((await lstat(dir)).isSymbolicLink())
            throw new Error(linkRefusal(dir, "directory"));
        await rename(tmp, f);
    }
    catch (e) {
        await unlink(tmp).catch(() => { });
        throw e;
    }
}
/** Layer names come from adopter-authored YAML keys and may contain spaces
 *  (`domain layer:` is legal YAML), so this excludes `>` and line terminators
 *  but not `\s`, which would fail closed on a waiver that works today. */
// `[^>]` alone matches a newline and there is no `m` flag, so a multi-line
// key would pass the shape check and then print a standalone,
// attacker-chosen advisory line at exit 0 (CWE-117) — the exact forgery
// clampLabel's own docstring names. Excluding line terminators makes the SHAPE check fail closed
// too, so the clamp is defence in depth rather than the only guard.
const KEY_RE = /^[^>\r\n\u2028\u2029]+->[^>\r\n\u2028\u2029]+$/;
export async function addException(ws, key, reason, expires) {
    if (reason.trim() === "") {
        throw new Error("architecture exception requires a non-empty --reason");
    }
    // CWE-20, fail closed. A key that `isExcepted` can never match must not be
    // accepted and confirmed — the gate would keep blocking and nothing would
    // say why. The shape check alone does NOT close this: the obvious paste,
    // `ui->data (package rules: "pkg-a/**")`, satisfies the shape. Validating
    // the pair against the layers the adopter actually declared is what catches
    // it — and catches a plain typo in the same stroke.
    if (!KEY_RE.test(key.trim())) {
        throw new Error(`architecture exception key must be "<from>-><to>" (got "${clampLabel(key)}")`);
    }
    // The pure checks run before any I/O, so an adopter who typos both the key
    // and the date is told about both in one round trip rather than two.
    if (Number.isNaN(Date.parse(expires))) {
        throw new Error(`architecture exception --expires must be a parseable date (got "${expires}")`);
    }
    const [from, to] = key.trim().split("->").map((s) => s.trim());
    const normalisedKey = `${from}->${to}`;
    const loaded = await loadArchConfig(ws);
    // A `deny`-without-`layers` config is `malformed`, not `ok`, and the
    // declared-layer check below only runs on `ok` — so without this refusal,
    // on exactly those configs the `(package rules: …)` paste this function
    // exists to reject would be accepted at exit 0 and PERSISTED. After the
    // adopter repairs the config the recorded waiver would silently never
    // match: accepted, confirmed, inert forever.
    //
    // Deny by default. A config we cannot read is a vocabulary we cannot check,
    // so recording is refused rather than guessed. `absent` and `inert` still
    // record — there is no declared vocabulary to be wrong about, and refusing
    // would block an adopter setting up waivers before writing their layers.
    if (loaded.kind === "malformed") {
        throw new Error(`the architecture config cannot be read (${loaded.detail}), so the layer ` +
            `names in this exception cannot be verified. Fix that file first — a ` +
            `waiver recorded now could silently never match. \`${resolveBrandSlugSync()} doctor\` ` +
            `names the file and the reason.`);
    }
    if (loaded.kind === "ok") {
        const declared = new Set();
        if (loaded.config.root)
            for (const n of Object.keys(loaded.config.root.layers))
                declared.add(n);
        for (const [, m] of loaded.config.packages) {
            for (const n of Object.keys(m.layers))
                declared.add(n);
        }
        const unknown = [from, to].filter((n) => !declared.has(n));
        if (unknown.length > 0) {
            // This module deliberately neither names the architecture config nor
            // calls its path accessor: the one-parser guard flags any file
            // that parses YAML and reaches that path, and this one parses a
            // DIFFERENT file. The declared-layer list is the actionable half
            // anyway; `doctor` is where the path is named.
            throw new Error(`architecture exception names ${unknown.map((n) => `"${clampLabel(n)}"`).join(" and ")}, ` +
                `which ${unknown.length > 1 ? "are" : "is"} not a layer your ` +
                `architecture config declares (declared: ${[...declared].sort().join(", ")}). ` +
                `Use the bare "<from>-><to>" pair the gate prints — a key copied with the ` +
                `\`(package rules: …)\` suffix records a waiver that can never match.`);
        }
    }
    // Validate the NORMALISED key, then store that same string. Validating
    // `key.trim()` and persisting the raw `key` would accept `except "ui -> data"`
    // and write `ui -> data` — while the runtime lookup is always
    // `exceptionKey(message)` = `ui->data`. Accepted, confirmed, can never
    // match: the same dead-end as above, one trim apart.
    const f = exceptionsFile(ws);
    const cur = await loadStoreStrict(f);
    // The adopter's own keys on an entry (`owner:`, `ticket:`) are kept.
    const prev = cur[normalisedKey];
    cur[normalisedKey] = { ...(prev && typeof prev === "object" ? prev : {}), reason, expires };
    await writeStoreAtomically(f, yaml.dump({ schema_version: 1, ...cur }));
}
//# sourceMappingURL=arch-exceptions-write.js.map