#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBrand, loadFramework, resolveBrand } from "./branding/load.js";
import { resolveBrandSlugSync } from "./branding/runtime.js";
import { substitute } from "./branding/substitute.js";
import { renderTemplate } from "./generator/template.js";
import { writeOutput } from "./generator/output.js";
import { confirm } from "@inquirer/prompts";
import { userInfo } from "node:os";
import { recordBypass } from "./hooks/bypass.js";
import { checkAndConfirmHooksConfig } from "./hooks/diff-confirm.js";
import { installHook } from "./hooks/install.js";
import { runHookOrchestrator } from "./hooks/orchestrator.js";
import { createIssue } from "./skills/create-issue.js";
import { createPr } from "./skills/implement/create-pr.js";
import { fetchIssue } from "./skills/implement/fetch-issue.js";
import { formatBranchName } from "./skills/implement/branch-name.js";
import { installSkills } from "./skills/install.js";
import { installAgents } from "./agents/install.js";
import { hookPathGuardCli } from "./cli/hook-path-guard.js";
import { detectFramework } from "./skills/test/detect-framework.js";
import { scaffoldTest } from "./skills/test/scaffold.js";
import { writeTest } from "./skills/test/write.js";
import { applyRules } from "./rules/apply.js";
import { discoverWorkspaceFiles } from "./rules/discover.js";
import { installRulePack } from "./rules/install-pack.js";
import { scanConflicts } from "./validate/conflicts.js";
import { countInstructions } from "./validate/instruction-count.js";
import { validateOutput } from "./validate/output-validity.js";
import { scanSecrets } from "./validate/secrets.js";
import { scanSecretsCli } from "./cli/scan-secrets.js";
import { runWizard } from "./wizard/runner.js";
import { VERSION } from "./index.js";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HELP_TEMPLATE = `
\${BRAND_NAME} — \${BRAND_LONG}

Usage:
  \${FRAMEWORK_SLUG} <command> [options]

Commands:
  init [options]    Initialize CLAUDE.md for this project
                      --yes              Use defaults; no prompts
                      --at-root          Write to ./CLAUDE.md (default is ./.claude/CLAUDE.md)
                      --replace          Overwrite if file exists
                      --merge            Backup-and-overwrite (writes .pre-\${BRAND_SLUG}.bak)
                      --no-companion     Skip CLAUDE.local.md.example + .gitignore update

  rules apply       Resolve .claude/rules/*.md against workspace files,
                    validate, and inject the matching rules into CLAUDE.md.
                    Re-runnable; replaces the previous rules block in place.

  rules install <pack> [--replace]
                    Install a bundled rule pack into .claude/rules/<pack>/.
                    L1 packs: security/owasp-top-10, patterns/clean-architecture,
                    patterns/hexagonal, patterns/layered-mvc.
                    Run \`rules apply\` afterwards to inject into CLAUDE.md.

  hook install      Register the \${BRAND_NAME} PreToolUse hook in
                    .claude/settings.json. One-time per developer.

  hook run [--event=<event>]
                    Internal — invoked by Claude Code via the registered
                    hook. Reads the event payload from stdin, runs the
                    configured chain from .\${BRAND_SLUG}/hooks.yaml.

  hook confirm      Interactive — review the unified diff of recent
                    .\${BRAND_SLUG}/hooks.yaml changes and accept (or reject) it.
                    Run this after editing hooks.yaml; \`hook run\` refuses
                    to proceed on unconfirmed changes.

  bypass --reason=<reason>
                    Skip the hook chain for the next commit only. Logged.

  skills install [--replace]
                    Copy bundled skill artefacts (SKILL.md, templates)
                    into ./.claude/skills/. Honours \${BRAND_*} substitution.

  agents install [--replace]
                    Copy bundled subagent artefacts (templates/agents/*.md)
                    into ./.claude/agents/. Honours \${BRAND_*} substitution.
                    Two agents at L1: code-reviewer, test-author.

  test detect-framework [<workspace>]
                    Print detected framework (jest|vitest|pytest|unknown)
                    as JSON. Exit 0 on known, 1 on unknown.

  test scaffold <source-path> --framework=<name>
                    Print a framework-appropriate test skeleton to stdout.
                    Warnings on stderr.

  test write <target-path>
                    Read content from stdin, write to target-path with
                    secret-scan + path-traversal + no-overwrite guards.

  create-issue [--force]
                    Internal — runtime helper for the create-issue skill.
                    Reads an IssuePayload JSON object from stdin, runs
                    preflight checks, and shells out to \`gh issue create\`.

  implement fetch-issue <id> [--repo=<owner/name>]
                    Internal — fetch an issue via \`gh issue view --json\`
                    and emit FetchedIssue JSON on stdout. Used by
                    /\${BRAND_SLUG}:implement for AC1.

  implement create-pr [--force]
                    Internal — read a PrPayload JSON from stdin, run
                    AC8 scanSecrets preflight, and shell to
                    \`gh pr create\`. Emits PR URL + number on success.

  implement branch-name
                    Internal — read {"id":N,"title":"..."} JSON from
                    stdin, apply formatBranchName with optional
                    .\${BRAND_SLUG}/skills/implement.yaml override, print the
                    branch name to stdout.

  scan-secrets      Internal — read text from stdin and emit
                    {"hits":[{"type","match","redacted"}, ...]} JSON
                    to stdout (exit 0). Used by /\${BRAND_SLUG}:review
                    for AC7 credential redaction.

  --version         Show version
  --help            Show this help

Documentation: https://github.com/kgn-git/praise
`.trim();
function parseInitArgs(rest) {
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
async function initCommand(args) {
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    console.log(`${brand.BRAND_NAME} init — generating CLAUDE.md (framework ${brand.FRAMEWORK_NAME} v${brand.FRAMEWORK_VERSION})`);
    const selections = await runWizard({ nonInteractive: args.yes });
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
    const result = await writeOutput({
        targetDir: process.cwd(),
        content,
        atRoot: args.atRoot,
        onExisting: args.onExisting,
        companionEnabled: args.companion,
        frameworkSlug: brand.FRAMEWORK_SLUG,
    });
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
    return 0;
}
async function rulesApplyCommand() {
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    console.log(`${brand.BRAND_NAME} rules apply — resolving \`.claude/rules/*.md\` (framework ${brand.FRAMEWORK_NAME} v${brand.FRAMEWORK_VERSION})`);
    const discovered = await discoverWorkspaceFiles(process.cwd());
    if (!discovered.ok) {
        console.error(`\n✗ Workspace must be a git repository to discover files. Run \`git init\` first, or commit your initial files.`);
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
    console.log(`\n✓ ${claudePath} updated (${result.appliedCount} rule(s) applied, ${result.skippedCount} skipped — no matching workspace files)`);
    return 0;
}
async function rulesInstallCommand(rest) {
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
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    const result = await installRulePack({
        packageRoot: PACKAGE_ROOT,
        workspaceDir: process.cwd(),
        packName,
        brand,
        onExisting: replace ? "replace" : "abort",
    });
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
    console.log(`\nNext: run \`${slug} rules apply\` to inject the new rules into CLAUDE.md.`);
    return 0;
}
async function hookRunCommand(rest) {
    let event = "PreToolUse";
    for (const arg of rest) {
        if (arg.startsWith("--event=")) {
            event = arg.slice("--event=".length);
        }
    }
    const slug = resolveBrandSlugSync();
    const result = await runHookOrchestrator({
        workspaceDir: process.cwd(),
        event,
        stdin: process.stdin,
        stderr: process.stderr,
        user: userInfo().username,
        // Non-interactive: stdin is owned by the Claude Code event payload.
        // The prompter is invoked when .${BRAND_SLUG}/hooks.yaml has changed; we
        // refuse and direct the user to `${BRAND_SLUG} hook confirm` for the
        // interactive review.
        prompter: async () => {
            process.stderr.write(`\n${slug}: .${slug}/hooks.yaml has changed since your last \`${slug} hook confirm\`.\n` +
                "Refusing to run hooks on unconfirmed changes.\n" +
                `Run \`${slug} hook confirm\` to review the diff and accept (or reject) the changes,\n` +
                `or run \`${slug} bypass --reason="<reason>"\` for an audited single-commit bypass.\n`);
            return false;
        },
    });
    return result.exitCode;
}
async function hookConfirmCommand() {
    const slug = resolveBrandSlugSync();
    const path = join(process.cwd(), `.${slug}`, "hooks.yaml");
    let content;
    try {
        content = await readFile(path, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT") {
            console.log(`No ${path} found — nothing to confirm.`);
            return 0;
        }
        console.error(`✗ ${err.message}`);
        return 1;
    }
    const result = await checkAndConfirmHooksConfig({
        workspaceDir: process.cwd(),
        currentContent: content,
        user: userInfo().username,
        prompter: async (diff) => {
            process.stdout.write(`\n.${slug}/hooks.yaml diff since your last confirmation:\n\n`);
            process.stdout.write(diff);
            process.stdout.write("\n");
            try {
                return await confirm({
                    message: "Trust these hook-config changes? `hook run` will use this set going forward.",
                    default: false,
                });
            }
            catch {
                return false;
            }
        },
    });
    if (result.action === "no-change") {
        console.log(`✓ .${slug}/hooks.yaml unchanged since your last confirmation.`);
    }
    else if (result.action === "confirmed") {
        console.log(`✓ Hook config confirmed — \`${slug} hook run\` will use this set.`);
    }
    else {
        console.log(`✗ Rejected. \`${slug} hook run\` will keep refusing on these changes.`);
    }
    return 0;
}
async function hookInstallCommand() {
    const result = await installHook(process.cwd());
    if (!result.ok) {
        console.error(`\n✗ ${result.error}`);
        return 1;
    }
    if (result.action === "already-installed") {
        console.log(`✓ Hook already registered in ${result.path}`);
    }
    else {
        console.log(`✓ Hook registered in ${result.path}`);
    }
    return 0;
}
async function skillsInstallCommand(rest) {
    const replace = rest.includes("--replace");
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    const result = await installSkills({
        sourceDir: join(PACKAGE_ROOT, "templates", "skills"),
        destDir: process.cwd(),
        brand,
        onExisting: replace ? "replace" : "abort",
    });
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
        console.log("\nRe-run with --replace to overwrite existing skill files (your edits will be lost).");
    }
    return 0;
}
async function agentsInstallCommand(rest) {
    const replace = rest.includes("--replace");
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    const result = await installAgents({
        sourceDir: join(PACKAGE_ROOT, "templates", "agents"),
        destDir: process.cwd(),
        brand,
        onExisting: replace ? "replace" : "abort",
    });
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
async function testCommand(argv) {
    const sub = argv[0];
    const rest = argv.slice(1);
    if (sub === "detect-framework") {
        const workspaceArg = rest[0] ?? process.cwd();
        const result = await detectFramework(workspaceArg);
        console.log(JSON.stringify(result));
        return result.framework === "unknown" ? 1 : 0;
    }
    if (sub === "scaffold") {
        let framework;
        let sourcePath;
        for (const arg of rest) {
            if (arg.startsWith("--framework=")) {
                const v = arg.slice("--framework=".length);
                if (v === "jest" || v === "vitest" || v === "pytest")
                    framework = v;
            }
            else if (sourcePath === undefined && !arg.startsWith("--")) {
                sourcePath = arg;
            }
        }
        if (framework === undefined || sourcePath === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} test scaffold <source-path> --framework={jest|vitest|pytest}`);
            return 1;
        }
        const result = await scaffoldTest({
            framework,
            sourcePath,
            workspaceDir: process.cwd(),
        });
        if (!result.ok) {
            console.error(`✗ ${result.error}`);
            return 1;
        }
        for (const w of result.warnings)
            console.warn(`⚠ ${w}`);
        console.log(`# suggested-target: ${result.suggestedTargetPath}`);
        process.stdout.write(result.content);
        return 0;
    }
    if (sub === "write") {
        const targetPath = rest[0];
        if (targetPath === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} test write <target-path>  (content read from stdin)`);
            return 1;
        }
        let buffer = "";
        for await (const chunk of process.stdin) {
            buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
        }
        const result = await writeTest({
            targetPath,
            content: buffer,
            workspaceDir: process.cwd(),
        });
        if (!result.ok) {
            console.error(`✗ ${result.error}`);
            if (result.secretHits && result.secretHits.length > 0) {
                for (const hit of result.secretHits) {
                    console.error(`  - line ${hit.line}: ${hit.type} ${hit.redacted}`);
                }
            }
            return 1;
        }
        console.log(`✓ ${result.written}`);
        return 0;
    }
    console.error(`Unknown test subcommand: ${sub}`);
    return 1;
}
async function createIssueCommand(rest) {
    const force = rest.includes("--force");
    // Read JSON payload from stdin.
    let buffer = "";
    for await (const chunk of process.stdin) {
        buffer +=
            typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    let payload;
    try {
        payload = JSON.parse(buffer);
    }
    catch (err) {
        console.error(`✗ invalid IssuePayload JSON on stdin: ${err.message}`);
        return 1;
    }
    if (typeof payload !== "object" ||
        payload === null ||
        typeof payload.title !== "string" ||
        typeof payload.body !== "string") {
        console.error(`✗ IssuePayload must be a JSON object with at least \"title\" and \"body\" string fields`);
        return 1;
    }
    const result = await createIssue(payload, { force });
    // Always relay warnings to stderr.
    for (const w of result.warnings) {
        const where = w.line !== undefined ? `line ${w.line}: ` : "";
        process.stderr.write(`⚠ ${w.type}: ${where}${w.message}\n`);
    }
    if (!result.ok) {
        if (result.error) {
            console.error(`\n✗ ${result.error}`);
        }
        else {
            console.error("\n✗ refusing to create issue — secret-pattern warning(s) above. Re-run with --force to override (audited).");
        }
        return 1;
    }
    console.log(`\n✓ ${result.ref.url}`);
    console.log(`  Issue #${result.ref.number}`);
    return 0;
}
async function scanSecretsCommand() {
    let buffer = "";
    for await (const chunk of process.stdin) {
        buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    const result = scanSecretsCli(buffer);
    process.stdout.write(result.output);
    return result.exitCode;
}
async function implementCommand(argv) {
    const sub = argv[0];
    const rest = argv.slice(1);
    if (sub === "fetch-issue") {
        let id;
        let repo;
        for (const arg of rest) {
            if (arg.startsWith("--repo=")) {
                repo = arg.slice("--repo=".length);
                if (repo === "") {
                    console.error("--repo= requires a value (e.g. --repo=owner/name)");
                    return 1;
                }
            }
            else if (!arg.startsWith("--") && id === undefined) {
                id = arg;
            }
            else {
                console.error(`Unknown argument: ${arg}`);
                return 1;
            }
        }
        if (id === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} implement fetch-issue <id> [--repo=<owner/name>]`);
            return 1;
        }
        const result = await fetchIssue(id, repo !== undefined ? { repo } : {});
        if (!result.ok) {
            console.error(`\n✗ ${result.error}`);
            return 1;
        }
        process.stdout.write(JSON.stringify(result.issue) + "\n");
        return 0;
    }
    if (sub === "create-pr") {
        const force = rest.includes("--force");
        let buffer = "";
        for await (const chunk of process.stdin) {
            buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
        }
        let payload;
        try {
            payload = JSON.parse(buffer);
        }
        catch (err) {
            console.error(`✗ invalid PrPayload JSON on stdin: ${err.message}`);
            return 1;
        }
        if (typeof payload !== "object" ||
            payload === null ||
            typeof payload.title !== "string" ||
            typeof payload.body !== "string") {
            console.error(`✗ PrPayload must be a JSON object with at least "title" and "body" string fields`);
            return 1;
        }
        const result = await createPr(payload, { force });
        for (const w of result.warnings) {
            const where = w.line !== undefined ? `line ${w.line}: ` : "";
            process.stderr.write(`⚠ ${w.type}: ${where}${w.message}\n`);
        }
        if (!result.ok) {
            if (result.error) {
                console.error(`\n✗ ${result.error}`);
            }
            else {
                console.error("\n✗ refusing to open PR — secret-pattern warning(s) above. Re-run with --force to override (audited).");
            }
            return 1;
        }
        console.log(`\n✓ ${result.ref.url}`);
        console.log(`  PR #${result.ref.number}`);
        return 0;
    }
    if (sub === "branch-name") {
        let buffer = "";
        for await (const chunk of process.stdin) {
            buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
        }
        let payload;
        try {
            payload = JSON.parse(buffer);
        }
        catch (err) {
            console.error(`✗ invalid branch-name payload: ${err.message}`);
            return 1;
        }
        if (typeof payload !== "object" ||
            payload === null ||
            typeof payload.id !== "number" ||
            typeof payload.title !== "string") {
            console.error(`✗ branch-name payload must be {"id": <number>, "title": <string>}`);
            return 1;
        }
        const slug = resolveBrandSlugSync();
        const configPath = join(process.cwd(), `.${slug}`, "skills", "implement.yaml");
        let branchPattern;
        try {
            const yaml = await readFile(configPath, "utf8");
            // Match one of:
            //   branchPattern: "value"        (double-quoted)
            //   branchPattern: 'value'        (single-quoted)
            //   branchPattern: bare-value     (no quote, no spaces, comment allowed after)
            // Comments after the value (`# comment`) are explicitly excluded.
            const match = yaml.match(/^branchPattern:[ \t]*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s#"'][^\s#]*))[ \t]*(?:#.*)?$/m);
            const captured = match?.[1] ?? match?.[2] ?? match?.[3];
            if (captured !== undefined)
                branchPattern = captured.trim();
        }
        catch {
            // file absent — use default
        }
        const typed = payload;
        const name = formatBranchName({ id: typed.id, title: typed.title }, branchPattern !== undefined ? { branchPattern } : {});
        process.stdout.write(name + "\n");
        return 0;
    }
    const slug = resolveBrandSlugSync();
    console.error(`Unknown implement subcommand: ${sub ?? "(none)"}`);
    console.error(`Usage: ${slug} implement <fetch-issue|create-pr|branch-name>`);
    return 1;
}
async function bypassCommand(rest) {
    let reason = "";
    for (const arg of rest) {
        if (arg.startsWith("--reason=")) {
            reason = arg.slice("--reason=".length);
        }
    }
    if (reason === "") {
        const slug = resolveBrandSlugSync();
        console.error(`${slug} bypass requires --reason="<text>"`);
        return 1;
    }
    const result = await recordBypass(process.cwd(), {
        reason,
        user: userInfo().username,
    });
    console.log(`✓ Bypass recorded — next git commit will skip the hook chain. Reason: "${reason}"\n  ${result.path}`);
    return 0;
}
async function main(argv) {
    const command = argv[0];
    if (command === "--version" || command === "-v") {
        console.log(VERSION);
        return 0;
    }
    if (command === "init") {
        const args = parseInitArgs(argv.slice(1));
        return initCommand(args);
    }
    if (command === "rules" && argv[1] === "apply") {
        return rulesApplyCommand();
    }
    if (command === "rules" && argv[1] === "install") {
        return rulesInstallCommand(argv.slice(2));
    }
    if (command === "hook" && argv[1] === "run") {
        return hookRunCommand(argv.slice(2));
    }
    if (command === "hook" && argv[1] === "install") {
        return hookInstallCommand();
    }
    if (command === "hook" && argv[1] === "confirm") {
        return hookConfirmCommand();
    }
    if (command === "bypass") {
        return bypassCommand(argv.slice(1));
    }
    if (command === "skills" && argv[1] === "install") {
        return skillsInstallCommand(argv.slice(2));
    }
    if (command === "agents" && argv[1] === "install") {
        return agentsInstallCommand(argv.slice(2));
    }
    if (command === "hook" && argv[1] === "path-guard") {
        return hookPathGuardCli();
    }
    if (command === "test") {
        return testCommand(argv.slice(1));
    }
    if (command === "create-issue") {
        return createIssueCommand(argv.slice(1));
    }
    if (command === "scan-secrets") {
        return scanSecretsCommand();
    }
    if (command === "implement") {
        return implementCommand(argv.slice(1));
    }
    const framework = await loadFramework(PACKAGE_ROOT);
    const brandConfig = await loadBrand(process.cwd());
    const brand = resolveBrand(framework, brandConfig);
    if (command === undefined || command === "--help" || command === "-h") {
        console.log(substitute(HELP_TEMPLATE, brand));
        return 0;
    }
    console.error(`Unknown command: ${command}`);
    console.log(substitute(HELP_TEMPLATE, brand));
    return 1;
}
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
//# sourceMappingURL=cli.js.map