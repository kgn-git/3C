// #19 AC4: architecture-exceptions store. Extends the security/suppress.ts
// pattern with a MANDATORY expiry — an expired exception no longer suppresses
// (the violation re-blocks), so there are no perpetual silent waivers.
//
// #430 AC11: moved down from src/skills/arch-boundary/ for the same reason
// #427 moved the loader. This is now ONE waiver surface with two consumers in
// different tiers — the commit gate (features) and the post-edit hook
// (platform) — and the live `deny: [platform, features]` pair means a shared
// store cannot live in either consumer. Before this the hook read only
// `validation.yaml`'s `suppress:` key, so a pair formally waived on the gate
// still fired on every edit.
//
// `exceptionKey` lives here too, and not beside the checker, because a waiver
// is only usable if the key the adopter is TOLD to file is the key the store
// is asked for. One encoding, one module.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
/** The waiver store's path. The writer lives in arch-exceptions-write.ts (#440). */
export function exceptionsFile(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "architecture-exceptions.yaml");
}
// checkLayerImport message: `"X" layer must not import from "Y" layer`.
// The pattern reads the pair BEFORE any `(package rules: …)` suffix is
// appended, so a waiver keyed on `from->to` matches a package-sourced finding
// exactly as it matches a root-sourced one (#427).
const MSG_RE = /"([^"]+)" layer must not import from "([^"]+)" layer/;
export function exceptionKey(message) {
    const m = MSG_RE.exec(message);
    return m ? `${m[1]}->${m[2]}` : null;
}
/**
 * The READER's shape filter: an entry without a string `reason` and
 * `expires` is skipped. Skipping is right here — fewer waivers means more
 * blocking — and wrong for the writer, which would rebuild the file without
 * it (#440). The writer has its own strict check in arch-exceptions-write.ts;
 * sharing this one is what made a typo'd field silently destroy a waiver.
 */
function entriesOf(raw) {
    const o = (raw && typeof raw === "object" ? raw : {});
    // Object.create(null), not {}: the keys come from adopter YAML, and
    // `out[k] = …` on an object literal hits Object.prototype's `__proto__`
    // setter for a `__proto__:` entry, replacing the returned object's
    // prototype. isExcepted's Object.hasOwn contains it today — but that is
    // the caller's discipline, and this makes it safe by construction.
    const out = Object.create(null);
    for (const [k, v] of Object.entries(o)) {
        if (k === "schema_version")
            continue;
        if (v &&
            typeof v === "object" &&
            typeof v.reason === "string" &&
            typeof v.expires === "string") {
            out[k] = {
                reason: v.reason,
                expires: v.expires,
            };
        }
    }
    return out;
}
export async function loadExceptions(ws) {
    try {
        return entriesOf(
        // JSON_SCHEMA, matching the sibling architecture.yaml loader: this file
        // is plain mappings and strings, and the richer default types have no
        // business on a path the post-edit hook reads on every edit (#430).
        // Bounded for the same reason arch-config.ts is — the hook reads this
        // on EVERY edit once #384 arms it.
        await (async () => {
            const f = exceptionsFile(ws);
            const st = await stat(f);
            if (!st.isFile() || st.size > MAX_EXCEPTIONS_BYTES)
                return {};
            return yaml.load(await readFile(f, "utf8"), { schema: yaml.JSON_SCHEMA });
        })());
    }
    catch {
        // Readers fail SOFT: no waivers means more blocking, which is the safe
        // direction. The WRITER (arch-exceptions-write.ts) reads strictly instead,
        // because rebuilding the file from an empty result would destroy it.
        return {};
    }
}
/** Bounded like architecture.yaml — the hook reads this on every edit. */
export const MAX_EXCEPTIONS_BYTES = 256 * 1024;
// AC4: excepted only if an entry exists AND its expiry is still in the future.
export function isExcepted(exc, key, now) {
    // Object.hasOwn, not a bare lookup: `exc` is an object literal, so any
    // `exc[word]` walks Object.prototype and a key like `constructor` returns a
    // truthy function. Today the `->` requirement makes that unreachable, which
    // is a property of the CALLER — and this repo has shipped that same bug
    // twice already (#395: `3c constructor` and `--since=constructor`).
    if (!Object.hasOwn(exc, key))
        return false;
    const e = exc[key];
    if (!e)
        return false;
    const t = Date.parse(e.expires);
    if (Number.isNaN(t))
        return false;
    return t > now.getTime();
}
//# sourceMappingURL=arch-exceptions.js.map