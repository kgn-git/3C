// #19 AC4: architecture-exceptions store. Extends the security/suppress.ts
// pattern with a MANDATORY expiry — an expired exception no longer suppresses
// (the violation re-blocks), so there are no perpetual silent waivers.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
function file(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "architecture-exceptions.yaml");
}
export async function loadExceptions(ws) {
    try {
        const raw = yaml.load(await readFile(file(ws), "utf8"));
        const o = (raw && typeof raw === "object" ? raw : {});
        const out = {};
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
    catch {
        return {};
    }
}
export async function addException(ws, key, reason, expires) {
    if (reason.trim() === "") {
        throw new Error("architecture exception requires a non-empty --reason");
    }
    if (Number.isNaN(Date.parse(expires))) {
        throw new Error(`architecture exception --expires must be a parseable date (got "${expires}")`);
    }
    const cur = { ...(await loadExceptions(ws)) };
    cur[key] = { reason, expires };
    const f = file(ws);
    await mkdir(dirname(f), { recursive: true });
    await writeFile(f, yaml.dump({ schema_version: 1, ...cur }), "utf8");
}
// AC4: excepted only if an entry exists AND its expiry is still in the future.
export function isExcepted(exc, key, now) {
    const e = exc[key];
    if (!e)
        return false;
    const t = Date.parse(e.expires);
    if (Number.isNaN(t))
        return false;
    return t > now.getTime();
}
//# sourceMappingURL=exceptions.js.map