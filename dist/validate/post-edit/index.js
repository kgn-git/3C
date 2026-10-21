import { readFile } from "node:fs/promises";
import { relative, isAbsolute } from "node:path";
import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { clampLabel, loadArchConfig, packageSuffix, resolveRulesWithSource, } from "../arch-config.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { checkLayerImport } from "./layers.js";
import { loadSuppress, isSuppressed } from "./suppress.js";
import { exceptionKey, isExcepted, loadExceptions } from "../arch-exceptions.js";
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
    // #394: layer-boundary is the ONLY rule this hook runs — the adopter-declared
    // check survives; the imposed style rules (import-order, naming-convention)
    // and the coaching segment that decorated their advisory are retired.
    const all = [];
    // #427: the same loader arch-check uses, so the hook honours the adopter's
    // declared `packages:` blocks instead of silently applying the root map.
    // matchAny normalises separators, so the raw relPath is safe to resolve on.
    //
    // #430 AC14: this hook stays ADVISORY on every kind — fail-closed belongs to
    // the commit gate, which runs once per commit, not to a hook that fires on
    // every edit. A malformed config yields no rules here and no exception; the
    // adopter learns about it from `arch-check check` and `doctor`, which can
    // actually stop something.
    const loaded = await loadArchConfig(workspaceDir);
    const resolved = loaded.kind === "ok" ? resolveRulesWithSource(loaded.config, relPath) : null;
    if (resolved) {
        const layerVs = checkLayerImport(relPath, content, resolved.map);
        // A finding from a package block names the block — the adopter authored
        // several maps, and the root one reads clean. Root-map findings keep the
        // exact message they have always had.
        const src = resolved.source;
        all.push(...(src.kind === "root"
            ? layerVs
            : layerVs.map((v) => ({
                ...v,
                message: `${v.message}${packageSuffix(src.glob)}`,
            }))));
    }
    // #430 AC11 — one waiver contract. The hook consulted `validation.yaml`'s
    // `suppress:` only, so a layer pair the adopter had formally waived on the
    // gate (`arch-check except`) still fired here, live, on every edit. Both
    // surfaces now read both stores, and `exceptionKey` reads the pair from the
    // message before any `(package rules: …)` suffix — so one key waives the
    // pair on the gate and the hook identically.
    const sup = await loadSuppress(workspaceDir);
    const exceptions = await loadExceptions(workspaceDir);
    const now = new Date();
    const violations = all.filter((v) => {
        if (isSuppressed(v.ruleId, relPath, sup))
            return false;
        const key = exceptionKey(v.message);
        return !(key && isExcepted(exceptions, key, now));
    });
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
    // Board r1 (security): this await used to sit AHEAD of the message, so an
    // append failure (EACCES on `.3c/`, ENOSPC, read-only checkout) threw past
    // the already-computed violations into the orchestrator's blanket catch —
    // which emits nothing and exits 0. The outcome was byte-identical to a clean
    // edit, on every edit, permanently. Observability must never be able to
    // suppress the finding it observes.
    try {
        await writeTelemetryEvent(workspaceDir, evt, tcfg);
    }
    catch {
        /* telemetry is not the control; a failure here must not silence it */
    }
    if (violations.length === 0)
        return empty;
    const slug = resolveBrandSlugSync();
    // Board r1 (security, demonstrated): `relPath` was the one interpolation on
    // this line that was NOT clamped, and this text now reaches the MODEL. A
    // filename carrying U+202E (legal on NTFS and POSIX) arrived intact — the
    // Trojan-Source forgery clampLabel exists to stop — and on POSIX a filename
    // may contain a newline, letting repo content forge extra advisory lines or
    // a whole second hook message inside the model's context. JSON.stringify
    // protects the envelope's well-formedness; the model receives the DECODED
    // string, so serialisation is not the control here.
    const safePath = clampLabel(relPath);
    const lines = violations
        .map((v) => `  - [${v.ruleId}] ${safePath}:${v.line} — ${v.message}`)
        .join("\n");
    // #384 AC9: name the off-switch where the adopter meets the advisory. The
    // commit-time gate has always printed this; the post-edit path printed
    // nothing, which was survivable while the hook never fired and a dead-end
    // (#344) once it fires on every edit. Same computed key as the gate — a
    // `<from>-><to>` placeholder produces a well-formed waiver that matches
    // nothing (#430 AC12).
    const keys = [...new Set(violations.map((v) => exceptionKey(v.message) ?? ""))]
        .filter((k) => k !== "")
        .sort()
        .slice(0, 3);
    const remedy = keys.length === 0
        ? ""
        : `Fix the dependency direction, or waive the pair: ` +
            keys
                .map((k) => `\`${slug} arch-check except "${k}" --reason="..." --expires=<date>\``)
                .join(", ") +
            `.\n`;
    return {
        violations,
        message: 
        // Board r1 (journey): the sibling commit-time gate says "commit blocked",
        // and this text now lands in the model's context. With no qualifier, an
        // agent that has seen the gate's wording can read an after-the-fact
        // advisory as a stop — and abandon or revert work the hook never
        // blocked and cannot block.
        `${slug} post-edit validation found ${violations.length} issue(s) ` +
            `(advisory — the edit was NOT blocked; fix when convenient):\n${lines}\n${remedy}`,
    };
}
//# sourceMappingURL=index.js.map