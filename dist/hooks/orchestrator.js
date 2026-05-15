// Synchronous hook orchestrator. AD-03 amendment (#69): the daemon
// originally specified for L1 defers to L2; this module is the L1
// alternative — it runs hooks via `child_process.spawn` parallelised
// with `Promise.all`, per-hook timeout via `AbortController`, no IPC.
import { spawn as nodeSpawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { consumeBypassToken } from "./bypass.js";
import { loadHooksConfig } from "./config.js";
import { resolveCredentials } from "./credentials.js";
import { checkAndConfirmHooksConfig } from "./diff-confirm.js";
import { readHookEventFromStdin } from "./event.js";
import { appendHookEvent } from "./event-log.js";
import { buildIsolatedCommand } from "./network-isolate.js";
const COMMIT_PATTERN = /^\s*git\s+commit\b/;
const INPUT_SUMMARY_MAX = 120;
export async function runHookOrchestrator(opts) {
    const spawn = opts.spawn ?? defaultSpawn;
    const slug = resolveBrandSlugSync();
    // 1. Read event payload (must succeed; otherwise fail-open with warn).
    const eventResult = await readHookEventFromStdin(opts.stdin);
    if (!eventResult.ok) {
        opts.stderr.write(`${slug} hook run: could not parse Claude Code event payload (${eventResult.error}); allowing tool call to proceed\n`);
        return { exitCode: 0 };
    }
    const event = eventResult.event;
    // 2. AC11: fast-path for non-commit invocations.
    if (!isCommitEvent(event)) {
        return { exitCode: 0 };
    }
    // 3. AC7: consume bypass token before any other check.
    const bypass = await consumeBypassToken(opts.workspaceDir);
    if (bypass !== null) {
        opts.stderr.write(`${slug}: hooks bypassed for this commit by ${bypass.user} — reason: "${bypass.reason}"\n`);
        return { exitCode: 0 };
    }
    // 4. AC8: read hooks.yaml content for diff-confirm gating.
    const hooksYamlPath = join(opts.workspaceDir, `.${slug}`, "hooks.yaml");
    let hooksContent;
    try {
        hooksContent = await readFile(hooksYamlPath, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT") {
            // No hooks.yaml = nothing to do.
            return { exitCode: 0 };
        }
        opts.stderr.write(`${slug} hook run: could not read ${hooksYamlPath} (${err.message}); allowing commit to proceed\n`);
        return { exitCode: 0 };
    }
    const confirm = await checkAndConfirmHooksConfig({
        workspaceDir: opts.workspaceDir,
        currentContent: hooksContent,
        user: opts.user,
        prompter: opts.prompter,
    });
    if (confirm.action === "rejected") {
        opts.stderr.write(`${slug}: refusing to run hooks — operator rejected the new hooks.yaml. Re-run after reviewing.\n`);
        return { exitCode: 2 };
    }
    // 5. Parse and validate hooks config (fail-open on errors per NFR-REL-01).
    const cfg = await loadHooksConfig(opts.workspaceDir);
    if (!cfg.ok) {
        opts.stderr.write(`${slug}: hooks.yaml is invalid — bypassing hook chain (commit allowed):\n`);
        for (const e of cfg.errors) {
            opts.stderr.write(`  - ${e.message}\n`);
        }
        return { exitCode: 0 };
    }
    // 6. Filter hooks: matching event + matcher (regex on tool name).
    const matching = cfg.config.hooks.filter((h) => h.event === opts.event && new RegExp(h.matcher).test(event.tool_name));
    if (matching.length === 0) {
        return { exitCode: 0 };
    }
    // 7. Run hooks in parallel.
    const inputSummary = buildInputSummary(event);
    const triggerEvent = opts.event;
    const runs = await Promise.all(matching.map((hook) => runOne(hook, event, inputSummary, triggerEvent, opts, spawn)));
    // 8. Aggregate.
    let blocked = false;
    for (const r of runs) {
        if (r.warning !== undefined)
            opts.stderr.write(r.warning);
        if (r.blocked)
            blocked = true;
    }
    return { exitCode: blocked ? 2 : 0 };
}
function isCommitEvent(event) {
    if (event.tool_name !== "Bash")
        return false;
    const cmd = event.tool_input.command;
    if (typeof cmd !== "string")
        return false;
    return COMMIT_PATTERN.test(cmd);
}
function buildInputSummary(event) {
    const cmd = typeof event.tool_input.command === "string"
        ? event.tool_input.command
        : "";
    const summary = `${event.tool_name}: ${cmd}`;
    if (summary.length <= INPUT_SUMMARY_MAX)
        return summary;
    return summary.slice(0, INPUT_SUMMARY_MAX - 3) + "...";
}
async function runOne(hook, _event, inputSummary, triggerEvent, opts, spawn) {
    const slug = resolveBrandSlugSync();
    const startedAt = new Date().toISOString();
    let exitCode = 0;
    let stderrText = "";
    let durationMs = 0;
    const resolved = await resolveCredentials(hook.command);
    if (!resolved.ok) {
        const msg = `${slug} hook "${hook.id}": missing credential(s) ${resolved.missing.join(", ")} — skipping (configure via OS keychain or env)\n`;
        await appendHookEvent(opts.workspaceDir, {
            schema_version: 1,
            hook_id: hook.id,
            trigger_event: triggerEvent,
            input_summary: inputSummary,
            exit_code: -1,
            duration_ms: 0,
            network_used: hook.network,
            self_correction_count: 0,
            timestamp: startedAt,
        });
        return { blocked: hook.blocking, warning: msg };
    }
    const isolated = buildIsolatedCommand({
        command: resolved.value,
        network: hook.network,
    });
    let warning = isolated.platformWarning
        ? `${slug} hook "${hook.id}": ${isolated.platformWarning}\n`
        : "";
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, hook.timeout);
    try {
        const result = await spawn(isolated.executable, isolated.args, {
            signal: controller.signal,
            timeoutMs: hook.timeout,
        });
        exitCode = result.exitCode;
        stderrText = result.stderr;
        durationMs = result.durationMs;
    }
    catch (err) {
        stderrText = err.message;
        exitCode = 1;
    }
    finally {
        clearTimeout(timer);
    }
    await appendHookEvent(opts.workspaceDir, {
        schema_version: 1,
        hook_id: hook.id,
        trigger_event: triggerEvent,
        input_summary: inputSummary,
        exit_code: exitCode,
        duration_ms: durationMs,
        network_used: hook.network,
        self_correction_count: 0,
        timestamp: startedAt,
    });
    if (timedOut) {
        // AC6 default: fail-open with warning per NFR-REL-01.
        warning += `${slug} hook "${hook.id}": timed out after ${hook.timeout}ms — fail-open (commit allowed)\n`;
        return { blocked: false, warning };
    }
    if (exitCode !== 0) {
        const tag = hook.blocking ? "ERROR" : "WARN";
        warning += `${slug} hook "${hook.id}" [${tag}]:\n${stderrText.trim()}\n`;
        return { blocked: hook.blocking, warning };
    }
    return { blocked: false, warning: warning === "" ? undefined : warning };
}
const defaultSpawn = (executable, args, { signal }) => new Promise((resolve) => {
    const t0 = Date.now();
    const child = nodeSpawn(executable, [...args], {
        stdio: ["ignore", "pipe", "pipe"],
        signal,
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => (stderr += chunk.toString("utf8")));
    child.on("close", (code) => resolve({
        exitCode: code ?? 1,
        stderr,
        durationMs: Date.now() - t0,
    }));
    child.on("error", (err) => resolve({
        exitCode: 1,
        stderr: err.message,
        durationMs: Date.now() - t0,
    }));
});
//# sourceMappingURL=orchestrator.js.map