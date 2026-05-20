import { normalizeSeverity } from "./severity.js";
const REQUIRED = [
    "summary",
    "reproSteps",
    "expected",
    "actual",
    "environment",
];
export function buildBugReport(input, env) {
    const missing = REQUIRED.filter((k) => {
        const v = input[k];
        return typeof v !== "string" || v.trim() === "";
    }).map(String);
    if (missing.length > 0)
        return { ok: false, missing };
    const sev = normalizeSeverity(input.severity);
    const attachments = input.attachments ?? [];
    const lines = [
        `## Summary`,
        input.summary.trim(),
        ``,
        `## Reproduction`,
        input.reproSteps.trim(),
        ``,
        `## Expected`,
        input.expected.trim(),
        ``,
        `## Actual`,
        input.actual.trim(),
        ``,
        `## Environment`,
        `- Reported: ${input.environment.trim()}`,
        `- OS: ${env.os}`,
        `- App version: ${env.appVersion}`,
        `- Commit: ${env.commitSha}`,
        ``,
        `## Severity`,
        `Severity: ${sev}`,
        ``,
        `## Attachments`,
        attachments.length > 0
            ? attachments.map((a) => `- ${a}`).join("\n")
            : `- none`,
    ];
    if (typeof input.suspectedRootCause === "string" &&
        input.suspectedRootCause.trim() !== "") {
        lines.push(``, `## Suspected Root Cause`, `Hypothetical: ${input.suspectedRootCause.trim()}`);
    }
    return {
        ok: true,
        payload: {
            title: `[bug] ${input.summary.trim()}`,
            body: lines.join("\n") + "\n",
            labels: ["bug"],
        },
    };
}
//# sourceMappingURL=report.js.map