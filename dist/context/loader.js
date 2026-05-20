import { join } from "node:path";
import { loadRules } from "../rules/loader.js";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { selectRules } from "./select.js";
import { loadScopedClaudeMd } from "./claudemd.js";
import { enforceBudget } from "./budget.js";
export async function loadDynamicContext(workspaceDir, filePath) {
    const rulesDir = join(workspaceDir, `.${resolveBrandSlugSync()}`, "rules");
    const loaded = await loadRules(rulesDir);
    const relPath = filePath.startsWith(workspaceDir)
        ? filePath.slice(workspaceDir.length).replace(/^[\\/]/, "")
        : filePath;
    const relevant = selectRules(loaded.rules, relPath);
    const { merged } = await loadScopedClaudeMd(workspaceDir, filePath);
    const b = enforceBudget(relevant, merged, 150);
    return {
        rules: b.kept,
        claudeMd: merged,
        instructionCount: b.count,
        remainingBudget: b.remaining,
        debugLog: b.debugLog,
    };
}
//# sourceMappingURL=loader.js.map