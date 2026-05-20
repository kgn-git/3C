// #24 AC1/AC2/AC3 — render a Rationale for `${BRAND_SLUG} explain`. Empty
// sections are omitted so the output stays readable.
export function formatRationale(ruleId, r) {
    const lines = [`Rationale — ${ruleId}`];
    if (r.origin)
        lines.push(`Origin: ${r.origin}`);
    if (r.reasoning)
        lines.push(`Reasoning: ${r.reasoning}`);
    if (r.examples.length > 0) {
        lines.push("Examples:");
        for (const e of r.examples)
            lines.push(`  - ${e}`);
    }
    if (r.incidents.length > 0) {
        lines.push("Incidents:");
        for (const i of r.incidents) {
            lines.push(`  - ${i.date} — ${i.description} (${i.link})`);
        }
    }
    if (r.research.length > 0) {
        lines.push("Research:");
        for (const x of r.research) {
            lines.push(`  - ${x.author}, "${x.title}" (${x.year}) ${x.url}`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=format.js.map