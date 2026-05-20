import { readFile } from "node:fs/promises";
import { join, relative, isAbsolute } from "node:path";
import { userInfo } from "node:os";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { checkImportOrder } from "./imports.js";
import { checkNaming } from "./naming.js";
import { checkLayerImport } from "./layers.js";
import { loadSuppress, isSuppressed } from "./suppress.js";
import { buildCoaching } from "./coaching.js";
async function loadLayerMap(ws) {
    try {
        const raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "architecture.yaml"), "utf8"));
        if (!raw || typeof raw.layers !== "object" || raw.layers === null) {
            return null;
        }
        const deny = Array.isArray(raw.deny)
            ? raw.deny.filter((d) => Array.isArray(d) &&
                d.length === 2 &&
                d.every((x) => typeof x === "string"))
            : [];
        return { layers: raw.layers, deny };
    }
    catch {
        return null;
    }
}
export async function postEditValidate(event, workspaceDir) {
    const empty = { violations: [], message: "" };
    const fp = event.tool_input.file_path;
    if (typeof fp !== "string" || fp === "")
        return empty;
    let content;
    try {
        content = await readFile(fp, "utf8");
    }
    catch {
        return empty; // AC4: never throw
    }
    const relPath = isAbsolute(fp) ? relative(workspaceDir, fp) : fp;
    const all = [
        ...checkImportOrder(content),
        ...checkNaming(content),
    ];
    const map = await loadLayerMap(workspaceDir);
    if (map)
        all.push(...checkLayerImport(relPath, content, map));
    const sup = await loadSuppress(workspaceDir);
    const violations = all.filter((v) => !isSuppressed(v.ruleId, relPath, sup));
    // AC6: telemetry carries NO file content — tool name + counts only.
    const tcfg = await loadTelemetryConfig(workspaceDir);
    const evt = {
        schema_version: 1,
        hook_id: "post-edit-validation",
        trigger_event: "PostToolUse",
        summary: safeSummary(event.tool_name),
        exit_code: violations.length > 0 ? 1 : 0,
        failure_category: violations.length > 0 ? "validation" : "none",
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise
            ? anonymiseId(userInfo().username, workspaceDir)
            : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(workspaceDir, evt, tcfg);
    if (violations.length === 0)
        return empty;
    const slug = resolveBrandSlugSync();
    const lines = violations
        .map((v) => `  - [${v.ruleId}] ${relPath}:${v.line} — ${v.message}`)
        .join("\n");
    // #23: synchronous, advisory coaching segment (no daemon — AD-03 L1-form).
    // Failure here must never break the #16 advisory.
    let coaching = "";
    try {
        coaching = await buildCoaching(workspaceDir, userInfo().username, violations);
    }
    catch {
        /* coaching is advisory — never block the agent on it */
    }
    return {
        violations,
        message: `${slug} post-edit validation found ${violations.length} issue(s) — please self-correct:\n${lines}\n${coaching}`,
    };
}
//# sourceMappingURL=index.js.map