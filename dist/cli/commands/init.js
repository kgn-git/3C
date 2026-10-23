import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { loadFramework, resolveBrand } from "../../branding/load.js";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { writeOutput } from "../../generator/output.js";
import { renderTemplate } from "../../generator/template.js";
import { scanConflicts } from "../../validate/conflicts.js";
import { countInstructions } from "../../validate/instruction-count.js";
import { validateOutput } from "../../validate/output-validity.js";
import { scanSecrets } from "../../validate/secrets.js";
import { DEFAULT_SELECTIONS, runWizard } from "../../wizard/runner.js";
import { currentBackup, reportBackup } from "../backup-scope.js";
import { PACKAGE_ROOT } from "../shared.js";
// `--brand` / `--brand-slug` (custom branding) fall to the generic
// unknown-option refusal below — no released adopter exists to redirect, so
// no retired-flag message is built.
export function parseInitArgs(rest) {
    let yes = false;
    let atRoot = false;
    let onExisting = "abort";
    let companion = true;
    for (const arg of rest) {
        switch (arg) {
            case "--yes":
            case "-y":
                yes = true;
                break;
            case "--at-root":
                atRoot = true;
                break;
            case "--replace":
                onExisting = "replace";
                break;
            case "--merge":
                onExisting = "replace-with-backup";
                break;
            case "--no-companion":
                companion = false;
                break;
            default:
                console.error(`Unknown option: ${arg}`);
                process.exit(1);
        }
    }
    return { yes, atRoot, onExisting, companion };
}
async function loadFragments(dir) {
    const map = new Map();
    const entries = await readdir(dir, { recursive: true, encoding: "utf8" });
    for (const entry of entries) {
        if (!entry.endsWith(".md"))
            continue;
        const fullPath = join(dir, entry);
        const key = entry.replaceAll(sep, "/").replace(/\.md$/, "");
        const content = await readFile(fullPath, "utf8");
        map.set(key, content);
    }
    return map;
}
function sha256(input) {
    return "sha256:" + createHash("sha256").update(input).digest("hex");
}
/**
 * What a terminal-less init tells its caller — the defaults it applied, and
 * the route to choose differently. `setup --replace` is NOT that route: it
 * never reaches init, so it cannot change these answers.
 */
function headlessNotice() {
    const s = DEFAULT_SELECTIONS;
    const slug = resolveBrandSlugSync();
    return (`${slug}: no terminal to answer prompts — used the defaults ` +
        `(project type: ${s.projectType}, language: ${s.language}, architecture: ${s.architecture}, ` +
        `tests: ${s.testMethodology} with ${s.testFramework}, security: ${s.securityFrameworks.join(", ") || "none"}). ` +
        `To choose differently, run \`${slug} init --merge\` in a terminal — it keeps a backup of your CLAUDE.md. ` +
        // Git Bash's mintty presents stdin as a pipe, so Node sees no terminal
        // even with a person at the prompt (not reproduced here; a known Node
        // behaviour on Windows), and lands on this path.
        `On Windows Git Bash, run it from PowerShell or cmd, or prefix \`winpty\`.\n`);
}
export async function initCommand(args) {
    // No namespace question: there is no custom branding, so every install is
    // `/3c-*` and there is nothing to ask.
    const brand = resolveBrand(await loadFramework(PACKAGE_ROOT));
    console.log(`${brand.BRAND_NAME} init — generating CLAUDE.md (framework ${brand.FRAMEWORK_NAME} v${brand.FRAMEWORK_VERSION})`);
    // With no terminal there is nobody to answer — a container, a CI job, a
    // script onboarding many repos — and the wizard would die at its first
    // prompt. A missing terminal means the defaults, SAID OUT LOUD (stderr, so a
    // CI parser reading stdout sees only the run). It only skips prompts:
    // nothing here reaches --replace, so no adopter file is overwritten.
    const headless = !args.yes && !process.stdin.isTTY;
    const selections = await runWizard({ nonInteractive: args.yes || headless });
    const templatesRoot = join(PACKAGE_ROOT, "templates", "claude-md");
    const baseTemplate = await readFile(join(templatesRoot, "default.md.tpl"), "utf8");
    const fragments = await loadFragments(join(templatesRoot, "fragments"));
    const generatedAt = new Date().toISOString();
    const inputHash = sha256(JSON.stringify(selections));
    const content = renderTemplate({
        baseTemplate,
        selections,
        fragments,
        brand,
        provenance: { generatedAt, inputHash },
    });
    const outputCheck = validateOutput(content);
    if (!outputCheck.valid) {
        console.error("\n✗ Generated CLAUDE.md failed validation:");
        for (const err of outputCheck.errors)
            console.error(`  - ${err}`);
        return 1;
    }
    // AC10: pre-write secret scan. Refuse to write a CLAUDE.md containing
    // anything that looks like a secret. Catches accidents in fragments or
    // (future) free-text inputs.
    const secretHits = scanSecrets(content);
    if (secretHits.hits.length > 0) {
        console.error(`\n✗ Generated CLAUDE.md contains ${secretHits.hits.length} potential secret(s):`);
        for (const hit of secretHits.hits) {
            console.error(`  - ${hit.type}: ${hit.redacted}`);
        }
        console.error("Aborting write. Investigate the source fragment(s) and re-run.");
        return 1;
    }
    // AC4 (scope (a)): scan the assembled output for known syntactic conflicts
    // across the curated keyword dictionary. Warn-level only at L1; broader
    // scan over ancestor + ~/.claude/CLAUDE.md + .claude/rules/*.md is deferred.
    const conflictScan = scanConflicts(content);
    if (conflictScan.conflicts.length > 0) {
        console.warn(`\n⚠ Generated CLAUDE.md contains ${conflictScan.conflicts.length} potential rule conflict(s):`);
        for (const conflict of conflictScan.conflicts) {
            console.warn(`  - ${conflict.category}: "${conflict.pair[0]}" vs "${conflict.pair[1]}"`);
        }
        console.warn("Review the generated file before committing.");
    }
    const directiveCount = countInstructions(content);
    if (directiveCount.warnLevel === "exceeded") {
        console.error(`\n✗ Generated CLAUDE.md has ${directiveCount.count} RFC-2119 directives (>= 150 hard limit per CS-02). Aborting.`);
        return 1;
    }
    if (directiveCount.warnLevel === "warn") {
        console.warn(`\n⚠ Generated CLAUDE.md has ${directiveCount.count} directives (warning at 120; hard limit 150).`);
    }
    // --replace and --merge both overwrite CLAUDE.md, so both take a
    // timestamped backup first. (--merge also keeps its .pre-<slug>.bak, which a
    // second run overwrites; the timestamped copy is the one that survives.)
    const backup = args.onExisting === "abort" ? undefined : currentBackup();
    let result;
    try {
        result = await writeOutput({
            targetDir: process.cwd(),
            content,
            atRoot: args.atRoot,
            onExisting: args.onExisting,
            companionEnabled: args.companion,
            frameworkSlug: brand.FRAMEWORK_SLUG,
            backup: backup?.preserve,
        });
    }
    catch (err) {
        console.error(`✗ could not write CLAUDE.md (${err.message}) — nothing was overwritten without a backup.`);
        return 1;
    }
    reportBackup(backup);
    // Said only once the defaults were actually WRITTEN: on an existing
    // CLAUDE.md init refuses below, and "using the defaults" would misdescribe
    // a run that wrote nothing.
    if (headless && result.action !== "abort")
        process.stderr.write(headlessNotice());
    if (result.action === "abort") {
        console.error(`\n✗ ${result.path} already exists. Re-run with --replace or --merge to overwrite.`);
        return 1;
    }
    console.log(`\n✓ ${result.path} (${directiveCount.count} RFC-2119 directives)`);
    if (result.backupPath)
        console.log(`✓ ${result.backupPath} (original preserved)`);
    if (result.companionPath)
        console.log(`✓ ${result.companionPath}`);
    if (result.gitignoreUpdated)
        console.log(`✓ .gitignore updated`);
    console.log("\nNext steps:");
    console.log("  1. Review the generated file with your team");
    console.log("  2. Add a CODEOWNERS entry: /.claude/  @your-steward");
    console.log("  3. Commit and open a PR");
    console.log(`\nSkills and agents install as /${brand.FRAMEWORK_SLUG}-<name> (e.g. /${brand.FRAMEWORK_SLUG}-review).`);
    return 0;
}
//# sourceMappingURL=init.js.map