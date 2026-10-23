// The `.3c/architecture.yaml` loader, in the platform tier so the hook and
// the gate share one parser and cannot disagree about declared boundaries.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { GLOB_REMEDIATION, globProblem, matchAny } from "../rules/glob-match.js";
// CWE-400: the hook runs on every edit, so an unbounded read is a hang on the
// critical path. Glob caps live in `globProblem`.
const MAX_CONFIG_BYTES = 256 * 1024;
/** Single owner of the path, so a probe cannot disagree with the loader. */
export function archConfigPath(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "architecture.yaml");
}
/** Pure over the loaded result: re-reading the file would open a
 *  check-then-use gap (CWE-367). `malformed` is not inert: that would fail open. */
export function isGateInert(r) {
    return r.kind === "absent" || r.kind === "inert";
}
/**
 * True when replacing the file would destroy adopter work. Not `isGateInert`:
 * named layers with no deny, and an unparseable file, enforce nothing yet hold
 * work. `malformed` counts as authored because unknowable means assume it matters.
 */
export function hasAuthoredContent(r) {
    if (r.kind === "absent")
        return false;
    if (r.kind === "inert")
        return r.declared;
    return true;
}
// Fails the config closed rather than matching nothing at hook time.
function badGlob(g) {
    const problem = globProblem(g);
    return problem === null ? null : `glob ${JSON.stringify(g)} ${problem} — ${GLOB_REMEDIATION}`;
}
function toLayerMap(raw) {
    if (!raw || typeof raw !== "object")
        return { state: "none" };
    const o = raw;
    if (o.layers === undefined) {
        // An orphaned `deny:` must not vanish silently while `packages:` keeps
        // the config loading `ok`.
        if (o.deny !== undefined) {
            return {
                state: "bad",
                reason: "`deny` is declared without `layers` — the pairs can match nothing",
            };
        }
        return { state: "none" };
    }
    if (typeof o.layers !== "object" || o.layers === null) {
        return { state: "bad", reason: "`layers` is not a mapping" };
    }
    // CWE-20: reject bad values here; downstream, a null element would crash
    // inside the hook's never-throw catch and swallow every finding.
    for (const [name, v] of Object.entries(o.layers)) {
        // A name must round-trip violation message -> `exceptionKey` -> `except`,
        // or the gate prints a waiver that can never be honoured.
        const nameProblem = layerNameProblem(name);
        if (nameProblem !== null)
            return { state: "bad", reason: nameProblem };
        if (!Array.isArray(v)) {
            return {
                state: "bad",
                reason: `layer "${clampLabel(name)}" is not a list of globs`,
            };
        }
        for (const g of v) {
            if (typeof g !== "string") {
                return {
                    state: "bad",
                    reason: `layer "${clampLabel(name)}" has a non-string entry`,
                };
            }
            // Checked here, not in the shared translator: a glob dropped there
            // matches nothing and leaves the file silently unchecked.
            const bad = badGlob(g);
            if (bad) {
                return { state: "bad", reason: `layer "${clampLabel(name)}": ${bad}` };
            }
        }
    }
    // `deny` decides what the gate blocks: a bad entry condemns the config, not
    // just itself, or a typo'd rule is enforced nowhere behind a normal pass.
    const layerNames = new Set(Object.keys(o.layers));
    const deny = [];
    if (o.deny !== undefined) {
        if (!Array.isArray(o.deny)) {
            return { state: "bad", reason: "`deny` is not a list of pairs" };
        }
        for (const [i, d] of o.deny.entries()) {
            if (!Array.isArray(d) ||
                d.length !== 2 ||
                !d.every((x) => typeof x === "string")) {
                return {
                    state: "bad",
                    reason: `deny entry ${i + 1} is not a ["from", "to"] pair of layer names`,
                };
            }
            // Reads as a rule, enforces nothing; no laxer than the waiver store.
            const undeclared = d.filter((n) => !layerNames.has(n));
            if (undeclared.length > 0) {
                return {
                    state: "bad",
                    reason: `deny entry ${i + 1} names ${undeclared.map((n) => `"${clampLabel(n)}"`).join(" and ")}, ` +
                        `which ${undeclared.length > 1 ? "are" : "is"} not a declared layer ` +
                        `(declared: ${[...layerNames].map((n) => clampLabel(n)).sort().join(", ") || "none"})`,
                };
            }
            deny.push(d);
        }
    }
    return { state: "ok", map: { layers: o.layers, deny } };
}
export async function loadArchConfig(ws) {
    const path = archConfigPath(ws);
    let text;
    try {
        // Stat first so an oversized file is refused unread. Only ENOENT means
        // absent; any other failure is a present file we could not use.
        const st = await stat(path);
        // A FIFO or /dev/zero reports size 0 and bypasses the cap; a cloned
        // repo can carry one in `.3c/`.
        if (!st.isFile()) {
            return { kind: "malformed", detail: `${path} is not a regular file` };
        }
        if (st.size > MAX_CONFIG_BYTES) {
            return {
                kind: "malformed",
                detail: `file is ${st.size} bytes (limit ${MAX_CONFIG_BYTES})`,
            };
        }
        text = await readFile(path, "utf8");
    }
    catch (e) {
        if (e.code === "ENOENT")
            return { kind: "absent" };
        return {
            kind: "malformed",
            detail: `could not be read: ${clampLabel(e.message)}`,
        };
    }
    let raw;
    try {
        // Plain mappings/lists/strings; richer YAML types have no business here.
        raw = yaml.load(text, { schema: yaml.JSON_SCHEMA });
    }
    catch (e) {
        // Not `message`: it embeds a snippet of the adopter's raw config.
        const y = e;
        const where = typeof y.mark?.line === "number" ? ` (line ${y.mark.line + 1})` : "";
        return {
            kind: "malformed",
            detail: clampLabel(`${y.reason ?? e.message}${where}`),
        };
    }
    // The shipped starter is comment-only; malformed would fail every fresh install.
    if (raw === undefined || raw === null) {
        return {
            kind: "inert",
            detail: "the file declares nothing (comments only)",
            declared: false,
        };
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
        return { kind: "malformed", detail: "the document is not a mapping" };
    }
    const o = raw;
    const root = toLayerMap(raw);
    if (root.state === "bad") {
        return { kind: "malformed", detail: `root block: ${root.reason}` };
    }
    const packages = [];
    if (o.packages !== undefined) {
        if (!o.packages || typeof o.packages !== "object" || Array.isArray(o.packages)) {
            return { kind: "malformed", detail: "`packages` is not a mapping" };
        }
        for (const [glob, block] of Object.entries(o.packages)) {
            const m = toLayerMap(block);
            // A rejected block condemns the whole config: dropping it would leave
            // its rules enforced nowhere behind a reported success.
            if (m.state !== "ok") {
                const why = m.state === "bad" ? m.reason : "declares no `layers`";
                return {
                    kind: "malformed",
                    detail: `packages block "${clampLabel(glob)}": ${why}`,
                };
            }
            const bad = badGlob(glob);
            if (bad) {
                return {
                    kind: "malformed",
                    detail: `packages block "${clampLabel(glob)}": ${bad}`,
                };
            }
            packages.push([glob, m.map]);
        }
    }
    if (root.state === "none" && packages.length === 0) {
        return {
            kind: "malformed",
            detail: "the document declares neither `layers` nor `packages`",
        };
    }
    const config = {
        root: root.state === "ok" ? root.map : null,
        packages,
    };
    // From what was named, not enforceability, so `layers: {}` is not authored.
    const declared = Object.keys(config.root?.layers ?? {}).length > 0 ||
        config.packages.some(([, m]) => Object.keys(m.layers).length > 0);
    // Across root and packages: a monorepo may deny only in package blocks.
    const enforcing = (config.root?.deny.length ?? 0) > 0 ||
        config.packages.some(([, m]) => m.deny.length > 0);
    if (!enforcing) {
        return {
            kind: "inert",
            detail: declared
                ? "layers are declared but no `deny` pair is — nothing is blocked"
                : "no layers are declared — nothing is blocked",
            declared,
        };
    }
    return { kind: "ok", config };
}
// First matching `packages:` glob wins (authoring order, not specificity),
// else root. The source lets a finding say which block fired.
export function resolveRules(cfg, relPath) {
    return resolveRulesWithSource(cfg, relPath)?.map ?? null;
}
export function resolveRulesWithSource(cfg, relPath) {
    // Normalised once here so callers may pass native separators.
    const p = relPath.split("\\").join("/");
    for (const [glob, map] of cfg.packages) {
        if (matchAny([glob], [p]))
            return { map, source: { kind: "package", glob } };
    }
    return cfg.root ? { map: cfg.root, source: { kind: "root" } } : null;
}
/**
 * So a crafted key cannot forge advisory lines (CWE-117). Globs and layer
 * names share one advisory line, so they share this clamp.
 */
export function clampLabel(s) {
    return s.replace(LABEL_STRIP, " ").slice(0, MAX_LABEL_CHARS);
}
export const MAX_LABEL_CHARS = 120;
/**
 * Inclusive ranges, exported so a test can enumerate every one. Controls, bidi
 * (Trojan Source), line separators and invisible format characters, which make
 * `ui` + U+200B look like `ui`. Escapes keep this file reviewable.
 */
export const LABEL_STRIP_RANGES = [
    [0x0000, 0x001f],
    [0x007f, 0x009f],
    [0x00ad, 0x00ad],
    [0x061c, 0x061c],
    [0x200b, 0x200f],
    [0x202a, 0x202e],
    [0x2066, 0x2069],
    [0x2028, 0x2029],
    [0xfeff, 0xfeff],
];
const hex4 = (cp) => `\\u${cp.toString(16).padStart(4, "0")}`;
const LABEL_CLASS = `[${LABEL_STRIP_RANGES.map(([lo, hi]) => (lo === hi ? hex4(lo) : `${hex4(lo)}-${hex4(hi)}`)).join("")}]`;
const LABEL_STRIP = new RegExp(LABEL_CLASS, "g");
const LABEL_CHAR = new RegExp(`^${LABEL_CLASS}$`);
/**
 * Why a layer name cannot round-trip into an `except` key, or null. Names the
 * specific cause; invisible characters are cited by code point, never raw.
 */
export function layerNameProblem(name) {
    if (name.length > MAX_LABEL_CHARS) {
        return `layer "${clampLabel(name.slice(0, 40))}…" is ${name.length} characters (limit ${MAX_LABEL_CHARS})`;
    }
    const chars = [...name];
    const bad = chars.findIndex((c) => LABEL_CHAR.test(c));
    if (bad !== -1) {
        const cp = chars[bad].codePointAt(0);
        return (`layer "${clampLabel(name).trim()}" contains U+${cp.toString(16).toUpperCase().padStart(4, "0")} ` +
            `at position ${bad + 1}, an invisible or control character — delete it from the name`);
    }
    // `except` trims its key, so "ui " could never be waived.
    if (name.trim() !== name) {
        const edge = /^\s/.test(name) ? 0 : chars.length - 1;
        const cp = chars[edge].codePointAt(0);
        return (`layer "${clampLabel(name.trim())}" has leading or trailing whitespace ` +
            `(U+${cp.toString(16).toUpperCase().padStart(4, "0")} at position ${edge + 1}) — remove it`);
    }
    if (/["'>]/.test(name)) {
        return (`layer "${clampLabel(name)}" contains a quote or ">", which cannot ` +
            `round-trip through a violation message into an \`except\` key`);
    }
    return null;
}
/** Shared so the hook and the gate encode the block identically. */
export function packageSuffix(glob) {
    return ` (package rules: "${clampLabel(glob)}")`;
}
//# sourceMappingURL=arch-config.js.map