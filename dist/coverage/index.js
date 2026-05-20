import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { loadTelemetryConfig } from "../telemetry/config.js";
import { writeTelemetryEvent } from "../telemetry/writer.js";
import { anonymiseId } from "../telemetry/anonymise.js";
import { parseIstanbulCoverage } from "./parse.js";
import { gitChangedLines } from "./diff.js";
import { loadCoverageConfig } from "./thresholds.js";
import { evaluateCoverageGate } from "./gate.js";
export async function runCoverageGate(workspaceDir, opts = {}) {
    const slug = resolveBrandSlugSync();
    let covJson = opts.coverageJson;
    if (covJson === undefined) {
        for (const p of [
            join(workspaceDir, `.${slug}`, "coverage-final.json"),
            join(workspaceDir, "coverage", "coverage-final.json"),
        ]) {
            try {
                covJson = await readFile(p, "utf8");
                break;
            }
            catch {
                /* try next */
            }
        }
    }
    const coverage = parseIstanbulCoverage(covJson ?? "{}");
    const changes = await gitChangedLines(workspaceDir, opts.runner);
    const config = await loadCoverageConfig(workspaceDir);
    const result = evaluateCoverageGate({ coverage, changes, config });
    // AC5/AC6: emit counts only — never file paths or source.
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "coverage-gate",
        trigger_event: "PrePR",
        summary: "coverage-gate",
        exit_code: result.blocked ? 1 : 0,
        failure_category: result.blocked ? "validation" : "none",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
    return result;
}
//# sourceMappingURL=index.js.map