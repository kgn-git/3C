import { userInfo } from "node:os";
import { loadTelemetryConfig } from "../telemetry/config.js";
import { writeTelemetryEvent } from "../telemetry/writer.js";
import { anonymiseId } from "../telemetry/anonymise.js";
import { gitChangedLines } from "../coverage/diff.js";
import { decideOutcome } from "./severity.js";
import { defaultLocalScanner } from "./scanner.js";
import { addedDependencies, checkDeps } from "./deps.js";
import { loadSuppressions, isSuppressed } from "./suppress.js";
export async function runSecurityGate(workspaceDir, opts = {}) {
    const scanner = opts.scanner ?? defaultLocalScanner;
    const changes = await gitChangedLines(workspaceDir, opts.runner);
    const changedFiles = changes.map((c) => c.file);
    const sast = await scanner.scan({ workspaceDir, changedFiles });
    const depDiff = opts.runner
        ? await opts.runner([
            "-C",
            workspaceDir,
            "diff",
            "--unified=0",
            "--no-color",
        ])
        : "";
    const deps = checkDeps(addedDependencies(depDiff), opts.depAdvisory ?? {});
    const supps = await loadSuppressions(workspaceDir);
    const active = [...sast, ...deps].filter((f) => !isSuppressed(f.id, supps));
    const { block } = decideOutcome(active);
    const blocking = active.filter((f) => f.severity === "critical" || f.severity === "high");
    const warnings = active.filter((f) => f.severity === "medium");
    const lines = [
        ...blocking.map((f) => `  [BLOCK ${f.severity}] ${f.id} ${f.ruleId} ${f.file}:${f.line} — ${f.detail}`),
        ...warnings.map((f) => `  [warn ${f.severity}] ${f.id} ${f.ruleId} ${f.file}:${f.line} — ${f.detail}`),
    ];
    const message = lines.length === 0
        ? "Security scan gate passed."
        : `Security scan gate:\n${lines.join("\n")}\n` +
            (block
                ? `Blocked. Fix, or record an accepted risk: \`security suppress <id> --reason="..."\`.\n`
                : "");
    // AC6: telemetry carries counts only — never file paths, secrets, or source.
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "security-scan-gate",
        trigger_event: "PreToolUse",
        summary: "security-scan-gate",
        exit_code: block ? 1 : 0,
        failure_category: block ? "validation" : "none",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
    return { blocked: block, warnings, message };
}
//# sourceMappingURL=index.js.map