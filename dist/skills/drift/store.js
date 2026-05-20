// #10 AC4/AC5: append-only JSONL run history under .${slug}/drift/runs.jsonl
// (AD-04 — drift runs are events → JSONL substrate, mirrors src/telemetry/).
// appendExternalViolations is the documented rule_id-keyed API #19 writes into.
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { isDriftRun } from "./types.js";
function runsPath(workspaceDir) {
    return join(workspaceDir, `.${resolveBrandSlugSync()}`, "drift", "runs.jsonl");
}
export async function appendRun(workspaceDir, run) {
    const p = runsPath(workspaceDir);
    await mkdir(dirname(p), { recursive: true });
    await appendFile(p, JSON.stringify(run) + "\n", "utf8");
}
export async function readRuns(workspaceDir) {
    let raw;
    try {
        raw = await readFile(runsPath(workspaceDir), "utf8");
    }
    catch {
        return [];
    }
    const out = [];
    for (const line of raw.split(/\r?\n/)) {
        if (line === "")
            continue;
        try {
            const v = JSON.parse(line);
            if (isDriftRun(v))
                out.push(v);
        }
        catch {
            // skip a corrupt line — fail safe (NFR-REL-03)
        }
    }
    return out;
}
// AC5: external violation source (#19 Architecture Boundary Enforcer) records
// into the SAME history, keyed by rule_id — no parallel store.
export async function appendExternalViolations(workspaceDir, ruleId, items) {
    const byDirectory = {};
    for (const it of items) {
        const d = it.file.split("\\").join("/").split("/").slice(0, -1).join("/");
        const key = d === "" ? "." : d;
        byDirectory[key] = (byDirectory[key] ?? 0) + 1;
    }
    const run = {
        schema_version: 1,
        timestamp: new Date().toISOString(),
        commit: null,
        filesScanned: 0,
        byRule: { [ruleId]: items.length },
        byDirectory,
        source: "external",
    };
    await appendRun(workspaceDir, run);
}
//# sourceMappingURL=store.js.map