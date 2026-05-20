import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { matchAny } from "../../rules/glob-match.js";
import { RULE_IDS } from "./types.js";
export async function loadSuppress(workspaceDir) {
    const file = join(workspaceDir, `.${resolveBrandSlugSync()}`, "validation.yaml");
    let raw;
    try {
        raw = yaml.load(await readFile(file, "utf8"));
    }
    catch {
        return { ruleIds: new Set(), pathGlobs: [] };
    }
    const list = (raw &&
        typeof raw === "object" &&
        Array.isArray(raw.suppress)
        ? raw.suppress
        : []);
    const ruleIds = new Set();
    const pathGlobs = [];
    const known = new Set(RULE_IDS);
    for (const item of list) {
        if (typeof item !== "string")
            continue;
        if (known.has(item))
            ruleIds.add(item);
        else
            pathGlobs.push(item);
    }
    return { ruleIds, pathGlobs };
}
export function isSuppressed(ruleId, filePath, cfg) {
    if (cfg.ruleIds.has(ruleId))
        return true;
    return matchAny(cfg.pathGlobs, [filePath.replace(/\\/g, "/")]);
}
//# sourceMappingURL=suppress.js.map