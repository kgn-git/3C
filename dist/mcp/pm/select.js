// #70 AC4 — resolve which PM tool create-issue routes to: the `--tool` flag
// overrides `.${BRAND_SLUG}/skills/create-issue.yaml`. Returns null when the
// effective tool is github/absent (the unchanged gh path — AC7).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
const ROUTED = ["jira", "linear", "gitlab"];
export async function resolvePmSelection(workspaceDir, toolFlag) {
    let cfg = {};
    try {
        const raw = yaml.load(await readFile(join(workspaceDir, `.${resolveBrandSlugSync()}`, "skills", "create-issue.yaml"), "utf8"));
        if (raw && typeof raw === "object")
            cfg = raw;
    }
    catch {
        /* no config — flag-only or gh path */
    }
    const tool = toolFlag ?? (typeof cfg.tool === "string" ? cfg.tool : undefined);
    if (!tool || !ROUTED.includes(tool))
        return null; // github/absent ⇒ gh path
    const pm = (cfg.pm && typeof cfg.pm === "object" ? cfg.pm : {});
    return {
        tool: tool,
        baseUrl: typeof pm.baseUrl === "string" ? pm.baseUrl : "",
        project: typeof pm.project === "string" ? pm.project : "",
        tokenRef: typeof pm.tokenRef === "string"
            ? pm.tokenRef
            : `${resolveBrandSlugSync()}-pm-${tool}-token`,
    };
}
//# sourceMappingURL=select.js.map