import { filterByGlobMatch } from "../rules/apply.js";
export function selectRules(rules, filePath) {
    return filterByGlobMatch(rules, [filePath.replace(/\\/g, "/")]);
}
//# sourceMappingURL=select.js.map