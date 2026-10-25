import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { loadTelemetryConfig } from "../telemetry/config.js";
import { writeTelemetryEvent } from "../telemetry/writer.js";
import { anonymiseId } from "../telemetry/anonymise.js";
import { decideOutcome } from "./severity.js";
import { defaultLocalScanner } from "./scanner.js";
import { changedDependencies } from "./manifest-diff.js";
import { checkDependencies, unreadableManifests } from "./dependency-check.js";
import { securityFileSet, SecurityBaseError, MAX_SCANNED_BYTES, } from "./files.js";
import { loadSuppressions, isSuppressed } from "./suppress.js";
export async function runSecurityGate(workspaceDir, opts = {}) {
    let result;
    try {
        result = await evaluate(workspaceDir, opts);
    }
    catch (err) {
        // A workspace that is not a git repository, or an `ls-files` listing over
        // the runner's 16 MiB buffer, would otherwise reach the CLI's fatal
        // handler, which exits 1, not the gate's blocking exit 2. A10: fail
        // closed, and no stack trace reaches the caller.
        result = {
            blocked: true,
            warnings: [],
            message: `Security scan gate: the tree could not be read — ${describe(err)}\n` +
                `Blocked — refusing to report a result for a tree that was not scanned.\n`,
        };
    }
    // Telemetry carries counts only — never file paths, secrets, or source.
    // Advisory, and it must never override the verdict: without this catch a
    // read-only `.3c/` would turn a computed BLOCK into an unhandled rejection.
    await recordOutcome(workspaceDir, result.blocked).catch(() => { });
    return result;
}
/**
 * The REASON, never the stack and never the command (a10).
 *
 * `promisify(execFile)` builds its rejection as `Command failed: <argv>\n<stderr>`,
 * so the first line is the git invocation — carrying the absolute workspace path,
 * which on Windows contains the OS username — and the actual cause
 * (`fatal: not a git repository…`) sits below it. Taking line 0 therefore leaked
 * an internal path AND withheld the one thing the operator needed, which is a10
 * exactly inverted. Prefer the diagnostic line; fall back to the whole message.
 */
function describe(err) {
    const raw = err instanceof Error ? err.message : String(err);
    const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
    const reason = lines.find((l) => /^(fatal|error|warning):/i.test(l.trim())) ??
        lines.find((l) => !/^Command failed:/i.test(l.trim())) ??
        lines[0] ??
        "unknown error";
    return reason.trim().slice(0, 300);
}
async function evaluate(workspaceDir, opts) {
    const scanner = opts.scanner ?? defaultLocalScanner;
    let fileSet;
    try {
        fileSet = await securityFileSet(workspaceDir, {
            ...(opts.runner ? { runner: opts.runner } : {}),
            ...(opts.base !== undefined ? { base: opts.base } : {}),
        });
    }
    catch (err) {
        if (!(err instanceof SecurityBaseError))
            throw err;
        // a10-exception-handling: the span to scan is unknown, so there is no
        // result to report. Reporting a pass here would make a gate that says
        // "passed" about a tree it never read.
        return {
            blocked: true,
            warnings: [],
            message: `Security scan gate: ${err.message}\n` +
                `Blocked — refusing to report a result for a tree that was not scanned.\n`,
        };
    }
    const changedFiles = [...fileSet.files];
    const change = changedDependencies(fileSet.manifests);
    if (change.unparseable.length > 0) {
        // The dependencies this change installs cannot be known, so there is no
        // dependency result to report.
        return {
            blocked: true,
            warnings: [],
            message: `Security scan gate: ${unreadableManifests(change.unparseable)}\nBlocked.\n`,
        };
    }
    const dep = await checkDependencies(workspaceDir, change, opts.depAdvisory);
    if (dep.kind === "outdated") {
        return {
            blocked: true,
            warnings: [],
            message: `Security scan gate: the saved advisory list was made by an earlier version of ${resolveBrandSlugSync()}, and this change adds dependencies. ` +
                `Run \`${resolveBrandSlugSync()} security refresh\` to rebuild it.\nBlocked.\n`,
        };
    }
    if (dep.kind === "unreadable") {
        // The list may have been edited to hide a package, and this change adds
        // dependencies it would have to speak for.
        return {
            blocked: true,
            warnings: [],
            message: `Security scan gate: the saved advisory list cannot be used, and this change adds dependencies. ` +
                `It may have been edited, so no dependency result is reported. ` +
                `Run \`${resolveBrandSlugSync()} security refresh\` to rebuild it.\nBlocked.\n`,
        };
    }
    const sast = await scanner.scan({ workspaceDir, changedFiles });
    const deps = dep.findings;
    const supps = await loadSuppressions(workspaceDir);
    const all = [...sast, ...deps];
    const active = all.filter((f) => !isSuppressed(f.id, supps));
    const suppressedCount = all.length - active.length;
    const { block } = decideOutcome(active);
    const blocking = active.filter((f) => f.severity === "critical" || f.severity === "high");
    const warnings = active.filter((f) => f.severity === "medium");
    const lines = [
        ...blocking.map((f) => `  [BLOCK ${f.severity}] ${f.id} ${f.ruleId} ${f.file}:${f.line} — ${f.detail}`),
        ...warnings.map((f) => `  [warn ${f.severity}] ${f.id} ${f.ruleId} ${f.file}:${f.line} — ${f.detail}`),
    ];
    // The size of what was read, always: "Security scan gate passed." must not
    // read identically whether the gate scanned forty files or none.
    const skippedNote = fileSet.skipped.length > 0
        ? `, ${fileSet.skipped.length} skipped as larger than ${MAX_SCANNED_BYTES} bytes`
        : "";
    const suppressedNote = suppressedCount > 0 ? `; ${suppressedCount} suppressed` : "";
    const scanned = `SAST: ${changedFiles.length} file(s) scanned${skippedNote}; ${dep.note}${suppressedNote}`;
    const advice = dep.advice.map((l) => `${l}\n`).join("");
    const message = advice +
        (lines.length === 0
            ? `Security scan gate passed (${scanned}).\n`
            : `Security scan gate (${scanned}):\n${lines.join("\n")}\n` +
                (block
                    ? `Blocked. Fix, or record an accepted risk: \`${resolveBrandSlugSync()} security suppress <id> --reason="..."\`.\n` +
                        // `suppress` records an accepted risk in the adopter's
                        // OWN code. A scratch file that was never part of the change is a
                        // different problem and needs a different route, or the only way
                        // out of an incidental block is to file a false claim.
                        //
                        // Stated precisely, because an agent may quote this verbatim as an
                        // adopter's route out of a block: .gitignore filters the
                        // UNTRACKED half only, so it does nothing for a file git already
                        // tracks, and an adopter who tried it there would see the block
                        // persist with no explanation.
                        `If a flagged file is untracked scratch that is not part of your change, add it to .gitignore ` +
                        `(.gitignore does not exclude a file git already tracks).\n`
                    : ""));
    return { blocked: block, warnings, message };
}
async function recordOutcome(workspaceDir, blocked) {
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "security-scan-gate",
        trigger_event: "PreToolUse",
        summary: "security-scan-gate",
        exit_code: blocked ? 1 : 0,
        failure_category: blocked ? "validation" : "none",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
}
//# sourceMappingURL=index.js.map