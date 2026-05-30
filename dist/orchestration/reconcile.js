// #256: deterministic reconciliation of multi-agent review findings — the core
// the review board's cross-check is built on. Pure functions + a JSON entry
// point so prose-orchestrated skills can invoke it deterministically (via the
// `3c reconcile` CLI), the way `/3c-review` shells out for secret-scanning.
const SEVERITY_RANK = {
    blocking: 3,
    warning: 2,
    suggestion: 1,
};
function normMsg(m) {
    return m.trim().toLowerCase().replace(/\s+/g, " ");
}
// Two findings are "the same" when they point at the same place + category and
// say substantially the same thing (whitespace/case-insensitive).
function keyOf(fnd) {
    return `${fnd.file ?? ""}:${fnd.line ?? ""}:${fnd.category}:${normMsg(fnd.message)}`;
}
function maxSeverity(a, b) {
    return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}
/**
 * Reconcile findings from N agents into one ranked, de-duplicated report.
 * - de-dupes identical findings across agents (merging provenance);
 * - a finding flagged by multiple agents at divergent severities is marked
 *   `needsHuman` and takes the max severity;
 * - ranks blocking → warning → suggestion, then by agent agreement count;
 * - verdict is `blocking` if any blocking finding, else `advisory` if any
 *   finding, else `clean`.
 */
export function reconcileFindings(byAgent) {
    const merged = new Map();
    const byAgentCount = {};
    for (const [agent, findings] of Object.entries(byAgent)) {
        byAgentCount[agent] = (byAgentCount[agent] ?? 0) + findings.length;
        for (const fnd of findings) {
            const k = keyOf(fnd);
            const existing = merged.get(k);
            if (existing) {
                existing.agents.add(agent); // map key is the authoritative agent label
                existing.severities.add(fnd.severity);
                existing.severity = maxSeverity(existing.severity, fnd.severity);
            }
            else {
                merged.set(k, {
                    agents: new Set([agent]),
                    severities: new Set([fnd.severity]),
                    severity: fnd.severity,
                    sample: fnd,
                });
            }
        }
    }
    const findings = [...merged.values()].map((m) => ({
        agents: [...m.agents].sort(),
        severity: m.severity,
        category: m.sample.category,
        message: m.sample.message,
        ...(m.sample.file !== undefined ? { file: m.sample.file } : {}),
        ...(m.sample.line !== undefined ? { line: m.sample.line } : {}),
        ...(m.sample.suggestion !== undefined ? { suggestion: m.sample.suggestion } : {}),
        needsHuman: m.severities.size > 1,
    }));
    findings.sort((a, b) => {
        const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (sev !== 0)
            return sev;
        if (b.agents.length !== a.agents.length)
            return b.agents.length - a.agents.length;
        return (a.file ?? "").localeCompare(b.file ?? "") || (a.line ?? 0) - (b.line ?? 0);
    });
    const summary = {
        blocking: findings.filter((x) => x.severity === "blocking").length,
        warning: findings.filter((x) => x.severity === "warning").length,
        suggestion: findings.filter((x) => x.severity === "suggestion").length,
        needsHuman: findings.filter((x) => x.needsHuman).length,
        byAgent: byAgentCount,
    };
    const verdict = summary.blocking > 0 ? "blocking" : findings.length > 0 ? "advisory" : "clean";
    return { findings, verdict, summary };
}
/** Render a BoardReport as a human-readable markdown board report. */
export function renderBoardReport(report) {
    const s = report.summary;
    const lines = [
        `# Review board — verdict: ${report.verdict}`,
        `blocking: ${s.blocking} · warning: ${s.warning} · suggestion: ${s.suggestion} · needs-human: ${s.needsHuman}`,
        "",
    ];
    if (report.findings.length === 0) {
        lines.push("No findings — clean.");
    }
    else {
        for (const fnd of report.findings) {
            const loc = fnd.file ? ` ${fnd.file}${fnd.line ? `:${fnd.line}` : ""}` : "";
            const who = `flagged by ${fnd.agents.join(" + ")}`;
            const flag = fnd.needsHuman ? " [needs-human: agents disagree on severity]" : "";
            lines.push(`- [${fnd.severity}]${loc} (${fnd.category}) — ${fnd.message} (${who})${flag}`);
            if (fnd.suggestion)
                lines.push(`    ↳ ${fnd.suggestion}`);
        }
    }
    return lines.join("\n") + "\n";
}
/** Parse a `Record<agent, Finding[]>` JSON document and render its board report. */
export function reconcileFromJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("expected a JSON object mapping agent -> Finding[]");
    }
    return renderBoardReport(reconcileFindings(parsed));
}
//# sourceMappingURL=reconcile.js.map