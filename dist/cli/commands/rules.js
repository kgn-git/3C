import { join } from "node:path";
import { loadFramework, resolveBrand } from "../../branding/load.js";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { applyRules } from "../../rules/apply.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { installRulePack } from "../../rules/install-pack.js";
import { currentBackup, reportBackup } from "../backup-scope.js";
import { GIT_INIT_REMEDIATION, PACKAGE_ROOT } from "../shared.js";
export async function rulesApplyCommand() {
    const framework = await loadFramework(PACKAGE_ROOT);
    const brand = resolveBrand(framework);
    console.log(`${brand.FRAMEWORK_NAME} rules apply — resolving \`.claude/rules/*.md\` (v${brand.FRAMEWORK_VERSION})`);
    const discovered = await discoverWorkspaceFiles(process.cwd());
    if (!discovered.ok) {
        console.error(`\n✗ Workspace must be a git repository to discover files. ${GIT_INIT_REMEDIATION}`);
        console.error(`  Detail: ${discovered.error}`);
        return 1;
    }
    const result = await applyRules({
        workspaceDir: process.cwd(),
        frameworkName: brand.FRAMEWORK_NAME,
        workspaceFiles: discovered.files,
        generatedAt: new Date().toISOString(),
    });
    // Print diagnostics regardless of success/failure.
    if (result.diagnostics.length > 0) {
        const errors = result.diagnostics.filter((d) => "severity" in d && d.severity === "error");
        const warnings = result.diagnostics.filter((d) => "severity" in d && d.severity === "warning");
        const loadErrors = result.diagnostics.filter((d) => !("severity" in d));
        if (errors.length > 0) {
            console.error(`\n✗ ${errors.length} rule error(s):`);
            for (const d of errors) {
                const detail = "remediation" in d && d.remediation ? ` — ${d.remediation}` : "";
                console.error(`  - ${d.path}:${d.line}: ${d.message}${detail}`);
            }
        }
        if (loadErrors.length > 0) {
            console.error(`\n✗ ${loadErrors.length} parse error(s):`);
            for (const d of loadErrors) {
                console.error(`  - ${d.path}:${d.line}: ${d.message}`);
            }
        }
        if (warnings.length > 0) {
            console.warn(`\n⚠ ${warnings.length} warning(s):`);
            for (const d of warnings) {
                console.warn(`  - ${d.path}:${d.line}: ${d.message}`);
            }
        }
    }
    if (result.action === "error") {
        console.error(`\n✗ ${result.error}`);
        return 1;
    }
    const claudePath = join(process.cwd(), ".claude", "CLAUDE.md");
    const packs = (xs) => (xs.length > 0 ? `: ${xs.join(", ")}` : "");
    console.log(`\n✓ ${claudePath} updated (${result.appliedCount} rule(s) injected, ${result.skippedCount} skipped — no matching workspace files)`);
    console.log(`  Injected into CLAUDE.md: ${result.injectedPacks.length} pack(s)${packs(result.injectedPacks)}`);
    console.log(`  On disk, loaded by Claude Code from .claude/rules/: ${result.diskPacks.length} pack(s)${packs(result.diskPacks)}`);
    if (result.diskPacks.length > 0) {
        console.log("  To copy a pack into CLAUDE.md instead, set `load: inject` in its rules' frontmatter.");
    }
    return 0;
}
export async function rulesInstallCommand(rest) {
    let packName;
    let replace = false;
    for (const arg of rest) {
        if (arg === "--replace") {
            replace = true;
        }
        else if (arg.startsWith("--")) {
            console.error(`Unknown option: ${arg}`);
            return 1;
        }
        else if (packName === undefined) {
            packName = arg;
        }
        else {
            console.error(`Unexpected argument: ${arg}`);
            return 1;
        }
    }
    if (packName === undefined) {
        const slug = resolveBrandSlugSync();
        console.error(`${slug} rules install requires a pack name, e.g. \`${slug} rules install security/owasp-top-10\``);
        return 1;
    }
    const backup = replace ? currentBackup() : undefined;
    const framework = await loadFramework(PACKAGE_ROOT);
    const brand = resolveBrand(framework);
    const result = await installRulePack({
        packageRoot: PACKAGE_ROOT,
        workspaceDir: process.cwd(),
        packName,
        brand,
        onExisting: replace ? "replace" : "abort",
        backup: backup?.preserve,
    });
    reportBackup(backup);
    if (!result.ok) {
        console.error(`✗ ${result.error}`);
        if (result.secretHits && result.secretHits.length > 0) {
            for (const { path, hit } of result.secretHits) {
                console.error(`  - ${path}: ${hit.type} ${hit.redacted}`);
            }
        }
        return 1;
    }
    for (const path of result.installed)
        console.log(`✓ ${path}`);
    for (const path of result.skipped)
        console.log(`↪ skipped (already exists): ${path}`);
    if (result.skipped.length > 0 && !replace) {
        console.log("\nRe-run with --replace to overwrite (your edits will be lost).");
    }
    for (const w of result.warnings)
        console.warn(`⚠ ${w}`);
    const slug = resolveBrandSlugSync();
    console.log(`\nNext: run \`${slug} rules apply\` — it injects \`load: inject\` rules into CLAUDE.md and names the ` +
        `\`load: disk\` packs there, which Claude Code loads from .claude/rules/ on its own.`);
    return 0;
}
//# sourceMappingURL=rules.js.map