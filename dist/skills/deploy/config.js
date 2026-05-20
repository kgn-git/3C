// #12 VP-02-F05 — config-driven deployment orchestrator. The team supplies
// the deploy/rollback/health/check commands in .${slug}/deploy.yaml; this
// skill owns the GATE SEQUENCE, never the deploy mechanism (L2 / CS-04).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
function str(v) {
    return typeof v === "string" && v !== "" ? v : undefined;
}
export async function loadDeployConfig(ws) {
    let raw;
    try {
        raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "deploy.yaml"), "utf8"));
    }
    catch {
        return null;
    }
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    const c = (o.checks && typeof o.checks === "object" ? o.checks : {});
    const cfg = {
        ...(str(o.deploy) ? { deploy: str(o.deploy) } : {}),
        ...(str(o.rollback) ? { rollback: str(o.rollback) } : {}),
        ...(str(o.health) ? { health: str(o.health) } : {}),
        checks: {
            ...(str(c.tests) ? { tests: str(c.tests) } : {}),
            ...(str(c.reviews) ? { reviews: str(c.reviews) } : {}),
        },
        productionEnvs: Array.isArray(o.productionEnvs)
            ? o.productionEnvs.filter((x) => typeof x === "string")
            : [],
    };
    return cfg;
}
//# sourceMappingURL=config.js.map