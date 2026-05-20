// #10 VP-01-F05 — compose: scan → group → delta(vs prev) → persist → render,
// + content-free telemetry (AC6) mirroring src/validate/post-edit/index.ts.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userInfo } from "node:os";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { scanDrift, listSourceFiles } from "./scan.js";
import { groupReport, formatReport } from "./group.js";
import { appendRun, readRuns } from "./store.js";
import { computeDelta } from "./delta.js";
const exec = promisify(execFile);
async function headCommit(ws) {
    try {
        const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: ws });
        return stdout.trim() || null;
    }
    catch {
        return null;
    }
}
export async function runDrift(workspaceDir, opts) {
    const prevRuns = await readRuns(workspaceDir);
    const lastScan = [...prevRuns]
        .reverse()
        .find((r) => r.source !== "external") ?? null;
    const sinceCommit = opts.incremental && lastScan?.commit ? lastScan.commit : undefined;
    const scanOpts = sinceCommit ? { sinceCommit } : {};
    const sourceFiles = await listSourceFiles(workspaceDir, scanOpts);
    const violations = await scanDrift(workspaceDir, scanOpts);
    const finalReport = groupReport(violations, sourceFiles.length);
    const delta = computeDelta(lastScan, finalReport);
    const run = {
        schema_version: 1,
        timestamp: new Date().toISOString(),
        commit: await headCommit(workspaceDir),
        filesScanned: finalReport.filesScanned,
        byRule: finalReport.byRule,
        byDirectory: finalReport.byDirectory,
        source: "scan",
    };
    await appendRun(workspaceDir, run);
    // AC6: telemetry carries NO file path or content — counts only.
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "standards-drift",
        trigger_event: "cli",
        summary: safeSummary("drift"),
        exit_code: finalReport.total > 0 ? 1 : 0,
        failure_category: finalReport.total > 0 ? "validation" : "none",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
    return {
        report: finalReport,
        delta,
        formatted: formatReport(finalReport, opts.format ?? "console"),
    };
}
//# sourceMappingURL=index.js.map