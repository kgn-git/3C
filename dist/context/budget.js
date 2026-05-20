import { countInstructions } from "../validate/instruction-count.js";
function prio(r) {
    return typeof r.fields.priority === "number" ? r.fields.priority : 0;
}
function render(rules, claudeMd) {
    return [claudeMd, ...rules.map((r) => r.body)].join("\n");
}
export function enforceBudget(rules, claudeMdText, max = 150) {
    // Drop order: lowest priority first; ties → later filename first.
    const order = [...rules].sort((a, b) => {
        if (prio(a) !== prio(b))
            return prio(a) - prio(b);
        return a.filename < b.filename ? 1 : -1;
    });
    const kept = [...rules];
    const dropped = [];
    const debugLog = [];
    let count = countInstructions(render(kept, claudeMdText)).count;
    let i = 0;
    while (count > max && i < order.length) {
        const victim = order[i++];
        const idx = kept.indexOf(victim);
        if (idx === -1)
            continue;
        kept.splice(idx, 1);
        dropped.push(victim);
        count = countInstructions(render(kept, claudeMdText)).count;
        debugLog.push(`dropped ${victim.filename} (priority ${prio(victim)}) — over ${max}-directive budget; now ${count}`);
    }
    return { kept, dropped, count, remaining: max - count, debugLog };
}
//# sourceMappingURL=budget.js.map