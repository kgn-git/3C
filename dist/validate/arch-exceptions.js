// Architecture-exceptions store. Every waiver has a MANDATORY expiry, and an
// expired one stops suppressing; the horizon itself is not capped.
//
// It lives in `validate` because two consumers in different tiers share it —
// the commit gate (features) and the post-edit hook (platform) — and the
// `deny: [platform, features]` pair forbids it living in either.
// `exceptionKey` lives here too: the key the adopter is TOLD to file must be
// the key the store is asked for.
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
/** The waiver store's path. The writer lives in arch-exceptions-write.ts. */
export function exceptionsFile(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "architecture-exceptions.yaml");
}
// Matches checkLayerImport's message before any `(package rules: …)` suffix,
// so a `from->to` waiver covers package- and root-sourced findings alike.
const MSG_RE = /"([^"]+)" layer must not import from "([^"]+)" layer/;
export function exceptionKey(message) {
    const m = MSG_RE.exec(message);
    return m ? `${m[1]}->${m[2]}` : null;
}
/**
 * The READER's shape filter: an entry without string `reason` and `expires`
 * is skipped, which errs toward blocking. The writer must not share it — it
 * would rebuild the file without the entry — so it has its own strict check.
 */
function entriesOf(raw) {
    const o = (raw && typeof raw === "object" ? raw : {});
    // Object.create(null): keys come from adopter YAML, and a `__proto__:` key
    // assigned onto `{}` would replace the returned object's prototype.
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
        // JSON_SCHEMA and a size bound: plain mappings only, on a path the
        // post-edit hook reads on every edit.
        await (async () => {
            const f = exceptionsFile(ws);
            const st = await stat(f);
            if (!st.isFile() || st.size > MAX_EXCEPTIONS_BYTES)
                return {};
            return yaml.load(await readFile(f, "utf8"), { schema: yaml.JSON_SCHEMA });
        })());
    }
    catch {
        // Readers fail SOFT: no waivers means more blocking, the safe direction.
        // The writer reads strictly, since rebuilding from {} would destroy the file.
        return {};
    }
}
export const MAX_EXCEPTIONS_BYTES = 256 * 1024;
// Excepted only if an entry exists AND its expiry is still in the future.
export function isExcepted(exc, key, now) {
    // Object.hasOwn: a bare `exc[word]` walks Object.prototype, so `constructor`
    // would return a truthy function. Callers' key shapes are not a safeguard.
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