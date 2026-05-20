// #24 AC1/AC4/AC5 — locate a rule via the shipped rules loader, then read its
// co-located sibling `<rule>.rationale.yaml` (same git tree — no DB, AD-01).
// Exported resolver is the seam #23 (coaching) and #22 (onboarding) consume.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { loadRules } from "../../rules/loader.js";
import { normalizeRationale } from "./types.js";
function ruleIdOf(filename) {
    return filename.replace(/\.md$/, "");
}
// #23 consumer: read a rationale by arbitrary key (e.g. a post-edit rule id
// like "import-order") directly from `.claude/rules/<key>.rationale.yaml`,
// WITHOUT requiring a matching rule file. Live read ⇒ edits auto-propagate.
export async function loadRationaleByKey(workspaceDir, key) {
    const p = join(workspaceDir, ".claude", "rules", `${key.replace(/\.md$/, "")}.rationale.yaml`);
    try {
        return normalizeRationale(yaml.load(await readFile(p, "utf8")));
    }
    catch {
        return null;
    }
}
export async function resolveRationale(workspaceDir, rawRuleId) {
    const rulesDir = join(workspaceDir, ".claude", "rules");
    const { rules } = await loadRules(rulesDir);
    const wanted = ruleIdOf(rawRuleId);
    const knownRuleIds = rules.map((r) => ruleIdOf(r.filename));
    const rule = rules.find((r) => ruleIdOf(r.filename) === wanted);
    if (!rule)
        return { found: false, knownRuleIds };
    // Sibling file: <rule>.rationale.yaml next to <rule>.md (co-versioned).
    const sibling = rule.path.replace(/\.md$/, ".rationale.yaml");
    let raw;
    try {
        raw = yaml.load(await readFile(sibling, "utf8"));
    }
    catch {
        return { found: false, knownRuleIds }; // rule exists but no rationale recorded
    }
    return {
        found: true,
        ruleId: wanted,
        rationale: normalizeRationale(raw),
    };
}
//# sourceMappingURL=resolve.js.map