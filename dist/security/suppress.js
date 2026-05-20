import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
function file(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "security-suppress.yaml");
}
export async function loadSuppressions(ws) {
    try {
        const raw = yaml.load(await readFile(file(ws), "utf8"));
        const o = (raw && typeof raw === "object" ? raw : {});
        const out = {};
        for (const [k, v] of Object.entries(o)) {
            if (k !== "schema_version" && typeof v === "string")
                out[k] = v;
        }
        return out;
    }
    catch {
        return {};
    }
}
export async function addSuppression(ws, id, reason) {
    const cur = { ...(await loadSuppressions(ws)) };
    cur[id] = reason;
    const f = file(ws);
    await mkdir(dirname(f), { recursive: true });
    await writeFile(f, yaml.dump({ schema_version: 1, ...cur }), "utf8");
}
export function isSuppressed(id, supps) {
    return Object.prototype.hasOwnProperty.call(supps, id);
}
//# sourceMappingURL=suppress.js.map