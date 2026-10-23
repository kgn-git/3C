import { join } from "node:path";
import { installAgents } from "../../agents/install.js";
import { loadFramework, resolveBrand } from "../../branding/load.js";
import { installSkills } from "../../skills/install.js";
import { listInstalledAgents, listInstalledSkills } from "../../skills/listing.js";
import { currentBackup, reportBackup } from "../backup-scope.js";
import { PACKAGE_ROOT } from "../shared.js";
export async function skillsInstallCommand(rest) {
    const replace = rest.includes("--replace");
    const backup = replace ? currentBackup() : undefined;
    const framework = await loadFramework(PACKAGE_ROOT);
    const brand = resolveBrand(framework);
    const result = await installSkills({
        sourceDir: join(PACKAGE_ROOT, "templates", "skills"),
        destDir: process.cwd(),
        brand,
        onExisting: replace ? "replace" : "abort",
        backup: backup?.preserve,
    });
    reportBackup(backup);
    if (!result.ok) {
        console.error(`✗ ${result.error}`);
        return 1;
    }
    for (const path of result.installed) {
        console.log(`✓ ${path}`);
    }
    for (const path of result.skipped) {
        console.log(`↪ skipped (already exists): ${path}`);
    }
    if (result.installed.length === 0 && result.skipped.length === 0) {
        console.log("No skills bundled in this build.");
    }
    if (result.skipped.length > 0 && !replace) {
        console.log("\nSkipped files were NOT refreshed. If you are upgrading, re-run with --replace — " +
            "without it a skill that changed upstream (or one that invokes a command since retired) " +
            "stays as it is. It overwrites your edits, so commit .claude/ first.");
    }
    return 0;
}
export async function agentsInstallCommand(rest) {
    const replace = rest.includes("--replace");
    const backup = replace ? currentBackup() : undefined;
    const framework = await loadFramework(PACKAGE_ROOT);
    const brand = resolveBrand(framework);
    const result = await installAgents({
        sourceDir: join(PACKAGE_ROOT, "templates", "agents"),
        destDir: process.cwd(),
        brand,
        onExisting: replace ? "replace" : "abort",
        backup: backup?.preserve,
    });
    reportBackup(backup);
    if (!result.ok) {
        console.error(`✗ ${result.error}`);
        return 1;
    }
    for (const path of result.installed) {
        console.log(`✓ agents/${path}`);
    }
    if (result.installed.length === 0) {
        console.log("No agents bundled in this build.");
    }
    return 0;
}
// Read-only discoverability. Skills are user-invoked slash commands;
// agents are dispatched workers (Task tool / auto-selection), never slash-run.
export async function skillsListCommand() {
    const skills = await listInstalledSkills(process.cwd());
    if (skills.length === 0) {
        console.log("No skills installed. Run `skills install` first.");
        return 0;
    }
    console.log("Installed skills — user-invoked slash commands:");
    for (const s of skills) {
        const mode = s.modelInvocable ? "auto+manual" : "manual-only";
        console.log(`  /${s.name}  [${mode}]  — ${s.description}`);
    }
    return 0;
}
export async function agentsListCommand() {
    const agents = await listInstalledAgents(process.cwd());
    if (agents.length === 0) {
        console.log("No agents installed. Run `agents install` first.");
        return 0;
    }
    console.log("Installed agents — dispatched by skills/Claude via the Task tool (NOT slash commands):");
    for (const a of agents) {
        console.log(`  ${a.name}  [${a.model}; tools: ${a.tools.join(", ")}]  — ${a.description}`);
    }
    return 0;
}
//# sourceMappingURL=install.js.map