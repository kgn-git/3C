import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
const DEFAULTS = {
    enabled: true,
    anonymise: true,
    sync: { enabled: false, endpoint: null, flushThreshold: 100 },
    retentionDays: 365,
};
export async function loadTelemetryConfig(workspaceDir) {
    const file = join(workspaceDir, `.${resolveBrandSlugSync()}`, "telemetry.yaml");
    let raw;
    try {
        raw = yaml.load(await readFile(file, "utf8"));
    }
    catch {
        return DEFAULTS; // absent/unreadable ⇒ safe defaults (still enabled)
    }
    const o = (raw && typeof raw === "object" ? raw : {});
    const s = (o.sync && typeof o.sync === "object" ? o.sync : {});
    return {
        enabled: o.enabled !== false,
        anonymise: o.anonymise !== false,
        sync: {
            enabled: s.enabled === true,
            endpoint: typeof s.endpoint === "string" ? s.endpoint : null,
            flushThreshold: typeof s.flushThreshold === "number" ? s.flushThreshold : 100,
        },
        retentionDays: typeof o.retentionDays === "number" ? o.retentionDays : 365,
    };
}
//# sourceMappingURL=config.js.map