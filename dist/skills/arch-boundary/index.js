// #19 VP-03-F05 — compose: resolve changed files → check → exceptions →
// bypass → #10 drift append (AC5) → content-free telemetry (AC7) → block (AC2).
// Standalone gate CLI pattern (mirrors #18 security scan); AD-03 L1-form, no daemon.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { appendExternalViolations } from "../drift/store.js";
import { loadArchConfig } from "./config.js";
import { loadExceptions } from "./exceptions.js";
import { checkFiles } from "./check.js";
const exec = promisify(execFile);
const SRC_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
async function stagedSourceFiles(ws) {
    try {
        const { stdout } = await exec("git", ["diff", "--cached", "--name-only"], { cwd: ws, maxBuffer: 32 * 1024 * 1024 });
        const staged = stdout.split(/\r?\n/).filter((l) => l !== "");
        if (staged.length > 0)
            return staged.filter((f) => SRC_RE.test(f));
    }
    catch {
        /* fall through to tracked */
    }
    const disc = await discoverWorkspaceFiles(ws);
    return disc.ok ? disc.files.filter((f) => SRC_RE.test(f)) : [];
}
export async function runArchBoundary(ws, opts) {
    const cfg = await loadArchConfig(ws);
    if (!cfg)
        return { blocked: false, message: "", notConfigured: true };
    const now = opts.now ?? new Date();
    const files = opts.changedFiles ?? (await stagedSourceFiles(ws));
    const exceptions = await loadExceptions(ws);
    const violations = await checkFiles(ws, files, cfg, exceptions, now);
    if (violations.length === 0)
        return { blocked: false, message: "" };
    // AC5: record into the SAME #10 drift history, keyed by rule_id.
    await appendExternalViolations(ws, "layer-boundary", violations.map((v) => ({
        file: v.file,
        line: v.line,
        message: v.message,
    })));
    // AC7: telemetry counts only — no file path / import string.
    const tcfg = await loadTelemetryConfig(ws);
    const bypassed = opts.bypassToken != null;
    const evt = {
        schema_version: 1,
        hook_id: "architecture-boundary",
        trigger_event: "PreToolUse",
        summary: safeSummary("arch-check"),
        exit_code: bypassed ? 0 : 2,
        failure_category: "validation",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, ws)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(ws, evt, tcfg);
    const slug = resolveBrandSlugSync();
    const lines = violations
        .map((v) => `  - [${v.ruleId}] ${v.file}:${v.line} — ${v.message}`)
        .join("\n");
    if (bypassed) {
        // AC6: gate failure does not hard-block when an emergency bypass is used.
        return {
            blocked: false,
            message: `${slug} architecture boundary: ${violations.length} violation(s) — allowed via emergency bypass (recorded).\n${lines}\n`,
        };
    }
    // AC2: block with the offending import, the rule, and remediation.
    return {
        blocked: true,
        message: `${slug} architecture boundary: ${violations.length} cross-boundary violation(s) — commit blocked:\n${lines}\n` +
            `Fix the dependency direction, or file a time-boxed exception: ` +
            `\`arch-check except "<from>-><to>" --reason="..." --expires=<date>\`, ` +
            `or emergency-bypass this commit: \`bypass --reason="..."\`.\n`,
    };
}
//# sourceMappingURL=index.js.map