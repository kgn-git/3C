import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export async function loadCoverageConfig(workspaceDir) {
    const file = join(workspaceDir, `.${resolveBrandSlugSync()}`, "coverage.yaml");
    let raw;
    try {
        raw = yaml.load(await readFile(file, "utf8"));
    }
    catch {
        return { minLines: 80, exempt: [] };
    }
    const o = (raw && typeof raw === "object" ? raw : {});
    const exempt = Array.isArray(o.exempt)
        ? o.exempt.filter((x) => typeof x === "string")
        : [];
    return {
        minLines: typeof o.minLines === "number" ? o.minLines : 80,
        exempt,
    };
}
//# sourceMappingURL=thresholds.js.map