// #12 VP-02-F05 — compose: preflight → prod-confirm → deploy → health →
// auto-rollback, with content-free telemetry. This skill orchestrates the
// gate sequence and shells out to TEAM-provided commands; not a deployer.
import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { loadDeployConfig } from "./config.js";
import { preflight } from "./preflight.js";
async function emit(ws, phase, exitCode) {
    // AC3 / NFR-SEC-06: counts + phase only — never the command, env, or secret.
    const tcfg = await loadTelemetryConfig(ws);
    const evt = {
        schema_version: 1,
        hook_id: "deployment",
        trigger_event: phase,
        summary: safeSummary("deploy"),
        exit_code: exitCode,
        failure_category: exitCode === 0 ? "none" : "tool",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, ws)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(ws, evt, tcfg);
}
const NO = { deployed: false, rolledBack: false };
export async function runDeploy(ws, opts) {
    const slug = resolveBrandSlugSync();
    const cfg = await loadDeployConfig(ws);
    if (!cfg || !cfg.deploy) {
        return {
            ...NO,
            blocked: true,
            needsConfirmation: false,
            message: `No deploy command configured. Add .${slug}/deploy.yaml with a \`deploy:\` command.`,
        };
    }
    // AC1/AC2: pre-flight gate.
    const pf = await preflight(cfg, {
        runner: opts.runner,
        gitRunner: opts.gitRunner,
    });
    if (!pf.ok) {
        return {
            ...NO,
            blocked: true,
            needsConfirmation: false,
            message: `Deployment blocked — pre-flight check(s) failed: ${pf.failed.join(", ")}. Resolve and retry.`,
        };
    }
    // AC6: production never proceeds without an explicit confirmation.
    if (cfg.productionEnvs.includes(opts.envName) && opts.confirmed !== true) {
        return {
            ...NO,
            blocked: false,
            needsConfirmation: true,
            message: `"${opts.envName}" is a production environment — re-run with explicit confirmation (--yes) to proceed.`,
        };
    }
    // Deploy (team command).
    const dep = await opts.runner(cfg.deploy);
    await emit(ws, "deploy", dep.exitCode);
    if (dep.exitCode !== 0) {
        return {
            ...NO,
            blocked: true,
            needsConfirmation: false,
            message: `Deploy command failed (exit ${dep.exitCode}).`,
        };
    }
    // AC4: post-deploy health check (if configured).
    if (cfg.health) {
        const h = await opts.runner(cfg.health);
        if (h.exitCode !== 0) {
            // AC5: failing health ⇒ automatic rollback.
            let rolledBack = false;
            if (cfg.rollback) {
                const rb = await opts.runner(cfg.rollback);
                await emit(ws, "rollback", rb.exitCode);
                rolledBack = rb.exitCode === 0;
            }
            return {
                deployed: false,
                blocked: false,
                needsConfirmation: false,
                rolledBack,
                message: `Post-deploy health check failed — ${rolledBack ? "rolled back automatically." : "rollback unavailable/failed."}`,
            };
        }
    }
    return {
        deployed: true,
        blocked: false,
        needsConfirmation: false,
        rolledBack: false,
        message: `Deployed to ${opts.envName}; post-deploy health check passed.`,
    };
}
//# sourceMappingURL=index.js.map