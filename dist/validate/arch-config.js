// #427: the ONE `.3c/architecture.yaml` loader. Moved down from
// src/skills/arch-boundary/ so every consumer — arch-check, doctor, the
// post-edit hook — imports the platform tier rather than a feature,
// and the hook can never again disagree with the gate about an adopter's
// declared boundaries (three hand-rolled parsers did exactly that: only one
// understood `packages:`). Originally #19 AC1/AC3; reuses the #16 LayerMap
// shape so checkLayerImport stays the single validation kernel.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { GLOB_REMEDIATION, globProblem, matchAny } from "../rules/glob-match.js";
// Caps at the consolidated choke point (#430 AC10). Same trust domain as the
// adopter's own repo, so these bound accident rather than attack — but the
// hook runs on every edit once #384 arms it, so an unbounded read or a
// pathological glob is a hang on the critical path (CWE-400).
const MAX_CONFIG_BYTES = 256 * 1024;
// Glob caps (length, `**` count, braces) live in glob-match.ts's
// `globProblem`, shared with every other loader of globs (#464).
/** The single owner of where this file lives, so a probe can never disagree
 *  with the loader about which file it means (#401 fixed one such divergence
 *  in doctor.ts by hand). */
export function archConfigPath(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "architecture.yaml");
}
/** True when the gate has nothing to enforce and should stay advisory.
 *  A PURE predicate over the loader's result — not a `ws`-taking function,
 *  which would read the file a second time on the always-on hook path and
 *  open a check-then-use gap (CWE-367). `malformed` is deliberately NOT
 *  inert: treating it as such is the fail-open this taxonomy closes. */
export function isGateInert(r) {
    return r.kind === "absent" || r.kind === "inert";
}
/**
 * True when the file holds declarations the adopter authored, so replacing it
 * would destroy work.
 *
 * Deliberately NOT the same question as `isGateInert`, and conflating the two
 * is how `discover` came to clobber configs: "enforces nothing" (the gate's
 * question) and "there is nothing here to lose" (discover's question) diverge
 * on exactly two files — a config whose layers are named but whose `deny`
 * list is still empty, and one that does not parse. Both hold real work.
 * `malformed` counts as authored precisely because we could NOT read it: when
 * the answer is unknowable the safe reading is that it matters.
 */
export function hasAuthoredContent(r) {
    if (r.kind === "absent")
        return false;
    if (r.kind === "inert")
        return r.declared;
    return true;
}
// #464: braces now expand, so a malformed set fails the config closed here
// rather than matching nothing at hook time. The glob is named because a
// layer may list several.
function badGlob(g) {
    const problem = globProblem(g);
    return problem === null ? null : `glob ${JSON.stringify(g)} ${problem} — ${GLOB_REMEDIATION}`;
}
function toLayerMap(raw) {
    if (!raw || typeof raw !== "object")
        return { state: "none" };
    const o = raw;
    if (o.layers === undefined) {
        // Board r2 (security + architecture, independently): returning "none"
        // here discarded a `deny:` written WITHOUT a `layers:` key — and when a
        // `packages:` block kept the document alive, the config loaded `ok` with
        // the whole root list gone, invalid entries and all. The gate then
        // reported a normal pass. That is the same false assurance the deny
        // validation below closes, one key up, reached by an ordinary refactor:
        // delete a root `layers:` block and leave its `deny:` behind.
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
    // Deny-by-default on the VALUES too (CWE-20): a plausible typo — a scalar
    // where a list belongs, or a null element in the list — must reject the
    // block here rather than surface downstream (a null element dereferences
    // inside the glob translator; the hook's never-throw catch would swallow
    // the crash together with every other finding for the edit).
    for (const [name, v] of Object.entries(o.layers)) {
        // A layer name has to survive a round trip the adopter depends on: the
        // violation message quotes it, `exceptionKey` reads the pair back out of
        // that message, and `arch-check except` takes the result. A name carrying
        // `"` makes the message's own quoting ambiguous, and one carrying `>`
        // makes the `from->to` key ambiguous — either way the gate prints a
        // waiver command that can never be honoured, which is the dead-end AC12
        // exists to close. Reject at the source rather than mint the dead key.
        // Board r2: derived from the clamp rather than duplicating part of it.
        // The message emits clampLabel(name), so ANY name the clamp alters —
        // a control character, or one longer than 120 chars — printed a waiver
        // key that addException then rejected as undeclared. Rejecting exactly
        // what cannot round-trip keeps the two in step automatically.
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
            // The cap lands HERE, not inside the shared glob translator: a glob
            // dropped there would match no file, so checkLayerImport would return
            // no findings and the file would be silently unchecked — a fail-open
            // inside the fail-closed fix. src/rules/glob-match.ts is shared with
            // four unrelated consumers and keeps its semantics.
            const bad = badGlob(g);
            if (bad) {
                return { state: "bad", reason: `layer "${clampLabel(name)}": ${bad}` };
            }
        }
    }
    // Board r1 (security + code + architecture, independently): `deny` is the
    // ONE list that decides what the gate blocks, and it was the one place the
    // "a rejected block condemns the config" ruling was NOT applied. Filtering
    // meant `deny: [[ui,data],[ui,infra,note]]` loaded as a healthy config with
    // the typo'd rule enforced nowhere, and the gate reported a normal pass —
    // the same false assurance this issue exists to remove, one level in.
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
            // A pair naming a layer that does not exist can never match anything —
            // it reads as a rule and enforces nothing. The waiver store already
            // refuses an undeclared layer name (arch-exceptions.ts); the config
            // itself must not be laxer about the same vocabulary than the waiver.
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
        // Stat first so an oversized file is refused without being read into
        // memory, and so a directory at this path is named as such rather than
        // reaching yaml.load. ENOENT is the ONLY shape that means "absent";
        // every other read failure is a present file we could not use.
        const st = await stat(path);
        // Board r1 (security): `isDirectory()` alone left every other non-regular
        // file through — a symlink to a FIFO or /dev/zero passes the check and
        // reports size 0, so the cap below is bypassed and readFile blocks or
        // exhausts memory. `.3c/` is a committed directory in this product's own
        // workflow, so a cloned repo can carry one. One predicate covers
        // directories, FIFOs, devices and sockets.
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
        // JSON_SCHEMA: architecture.yaml is plain mappings/lists/strings — the
        // richer default types (binary, timestamp) have no business here, and
        // consolidation makes the restriction cover all four consumers at once.
        raw = yaml.load(text, { schema: yaml.JSON_SCHEMA });
    }
    catch (e) {
        // `reason` is js-yaml's diagnosis; `message` additionally embeds a mark
        // snippet of the adopter's raw file, which would put up to 120 bytes of
        // their config into every surface that renders `detail` (board r1).
        const y = e;
        const where = typeof y.mark?.line === "number" ? ` (line ${y.mark.line + 1})` : "";
        return {
            kind: "malformed",
            detail: clampLabel(`${y.reason ?? e.message}${where}`),
        };
    }
    // An empty or comment-only document is the shipped STARTER (#246) and must
    // stay inert — classifying it malformed would fail the gate closed on every
    // fresh install.
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
            // Product ruling (#430, 2026-08-02): a rejected block condemns the
            // WHOLE config rather than being dropped. Dropping it left that
            // package's declared rules enforced nowhere while the gate reported
            // success — the same false assurance the epic exists to remove, one
            // block in. Refusing is loud; silence was the unacceptable option.
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
    // Board r1: derived from what was actually NAMED, not from enforceability.
    // Computing it from "not enforcing" made `layers: {}` report authored
    // content, so discover redirected to a proposal to preserve a file holding
    // nothing and doctor said it "declares layers" when it declares none.
    const declared = Object.keys(config.root?.layers ?? {}).length > 0 ||
        config.packages.some(([, m]) => Object.keys(m.layers).length > 0);
    // Enforceability is judged across root AND packages: a monorepo whose root
    // declares no pairs but whose package blocks do is enforcing. A config with
    // no pair anywhere parses fine and blocks nothing — reporting that as
    // "configured" is the empty all-clear #430 removes.
    const enforcing = (config.root?.deny.length ?? 0) > 0 ||
        config.packages.some(([, m]) => m.deny.length > 0);
    if (!enforcing) {
        return {
            kind: "inert",
            detail: declared
                ? "layers are declared but no `deny` pair is — nothing is blocked"
                : "no layers are declared — nothing is blocked",
            // The adopter named these layers. The gate enforces nothing, but the
            // file is not disposable.
            declared,
        };
    }
    return { kind: "ok", config };
}
// AC3 (#19): a file under a package glob uses that package's block; otherwise
// the root block; a package without its own block inherits root. Globs are
// tried in `packages:` key order and the FIRST match wins — overlapping globs
// resolve by authoring order, not specificity. The source is carried so a
// consumer surfacing a finding can say WHICH block fired — the adopter
// authored several, and only one of them produced the rule.
/** The source-free form of `resolveRulesWithSource`, kept for callers that
 *  only need the map. */
export function resolveRules(cfg, relPath) {
    return resolveRulesWithSource(cfg, relPath)?.map ?? null;
}
export function resolveRulesWithSource(cfg, relPath) {
    // The loader owns its own precondition: callers pass native or posix
    // separators and this normalises once, instead of three call sites each
    // stating the contract a different way.
    const p = relPath.split("\\").join("/");
    for (const [glob, map] of cfg.packages) {
        if (matchAny([glob], [p]))
            return { map, source: { kind: "package", glob } };
    }
    return cfg.root ? { map: cfg.root, source: { kind: "root" } } : null;
}
/**
 * Clamp an adopter-authored YAML string before it is interpolated into an
 * agent-facing advisory: control characters stripped, length capped, so a
 * crafted key cannot forge additional advisory lines (CWE-117). Used for
 * `packages:` globs here and for layer names in the violation kernel — the
 * two channels share one advisory line and must share one clamp.
 */
export function clampLabel(s) {
    // Board r2: the class covers bidirectional overrides and line/paragraph
    // separators as well as C0/DEL. U+202E survived the old class and can
    // visually reorder the rest of a rendered advisory line (Trojan Source)
    // — the same forgery the control-character strip exists to stop, in a
    // character the strip never named. This is ALSO what makes the layer-name
    // predicate correct: it rejects any name clampLabel would alter.
    return s.replace(LABEL_STRIP, " ").slice(0, MAX_LABEL_CHARS);
}
/** The longest label an advisory carries. */
export const MAX_LABEL_CHARS = 120;
/**
 * The code points `clampLabel` strips, as inclusive ranges — exported so a
 * test can enumerate EVERY one rather than a hand-picked few (#430 shipped a
 * clamp test asserting the absence of characters its input never held).
 * C0 and C1 controls and DEL; bidi marks, embeddings, overrides and isolates (Trojan
 * Source); line and paragraph separators; and (#440) the invisible format
 * characters — ARABIC LETTER MARK, the zero-width space/joiners, the BOM and
 * the soft hyphen — which render as nothing, so `ui` + U+200B looked exactly
 * like a declared `ui`. Written as escapes: this file must never again carry
 * the characters themselves, which made it unreadable to review.
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
 * cause that FIRED (#440 AC16) — length, an invisible character (by code
 * point and position, never rendered raw), edge whitespace, or a quote/`>` —
 * where one message used to blame a quote for all of them.
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
    // `except` trims the key it is given, so "ui " loads and can then never be
    // waived: the name it is asked for is "ui" (#440 AC15). trim() also removes
    // whitespace the eye cannot see (U+00A0, U+3000), so the offending edge
    // character is named by code point, never printed raw.
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
/**
 * The advisory suffix naming which `packages:` block produced a finding.
 * One encoding, used by both the post-edit hook and the arch-check gate.
 */
export function packageSuffix(glob) {
    return ` (package rules: "${clampLabel(glob)}")`;
}
//# sourceMappingURL=arch-config.js.map