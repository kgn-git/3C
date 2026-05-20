import { userInfo } from "node:os";
import { createIssue, } from "../create-issue.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { captureEnv } from "./env.js";
import { buildBugReport } from "./report.js";
export async function runBugReport(input, workspaceDir, opts = {}) {
    const env = await captureEnv(opts.gitRunner
        ? { gitRunner: opts.gitRunner, packageRoot: workspaceDir }
        : { packageRoot: workspaceDir });
    const built = buildBugReport(input, env);
    if (!built.ok)
        return { filed: false, missing: built.missing };
    const res = await createIssue(built.payload, opts.spawn ? { spawn: opts.spawn } : {});
    // AC6: telemetry carries NO report content — tool name + outcome only.
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "bug-report-skill",
        trigger_event: "Skill",
        summary: safeSummary("bug"),
        exit_code: res.ok ? 0 : 1,
        failure_category: res.ok ? "none" : "validation",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
    return res.ok
        ? { filed: true, ref: res.ref, warnings: res.warnings }
        : { filed: false, warnings: res.warnings };
}
//# sourceMappingURL=index.js.map