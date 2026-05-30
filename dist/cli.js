#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadBrand, loadFramework, resolveBrand } from "./branding/load.js";
import { resolveBrandSlugSync } from "./branding/runtime.js";
import { substitute } from "./branding/substitute.js";
import { renderTemplate } from "./generator/template.js";
import { writeOutput } from "./generator/output.js";
import { confirm } from "@inquirer/prompts";
import { userInfo } from "node:os";
import { recordBypass, consumeBypassToken } from "./hooks/bypass.js";
import { checkAndConfirmHooksConfig } from "./hooks/diff-confirm.js";
import { installHook } from "./hooks/install.js";
import { runHookOrchestrator } from "./hooks/orchestrator.js";
import { loadTelemetryConfig } from "./telemetry/config.js";
import { parseWindow } from "./telemetry/window.js";
import { readEventsInWindow } from "./telemetry/read.js";
import { dashboardMetrics } from "./dashboard/metrics.js";
import { renderDashboardHtml } from "./dashboard/render.js";
import { runCoverageGate } from "./coverage/index.js";
import { runSecurityGate } from "./security/index.js";
import { addSuppression } from "./security/suppress.js";
import { loadDynamicContext } from "./context/loader.js";
import { createIssue } from "./skills/create-issue.js";
import { runBugReport } from "./skills/bug/index.js";
import { runDrift } from "./skills/drift/index.js";
import { runArchBoundary } from "./skills/arch-boundary/index.js";
import { addException } from "./skills/arch-boundary/exceptions.js";
import { writeStarterArchConfig } from "./skills/arch-boundary/scaffold.js";
import { reconcileFromJson } from "./orchestration/reconcile.js";
import { loadGraph, resolveOrder, addEdge, serialize } from "./orchestration/deps.js";
import { runStandardsHistory, runStandardsAsOf, } from "./skills/standards-history/index.js";
import { runDeploy } from "./skills/deploy/index.js";
import { scaffoldDeployment } from "./skills/deploy-init/index.js";
import { upgradeDeployment } from "./skills/deploy-init/upgrade.js";
import { resolveRationale } from "./skills/rationale/resolve.js";
import { formatRationale } from "./skills/rationale/format.js";
import { runOnboard } from "./skills/onboard/index.js";
import { runOnboardGuide } from "./skills/onboard-guide/index.js";
import { createPr } from "./skills/implement/create-pr.js";
import { fetchIssue } from "./skills/implement/fetch-issue.js";
import { formatBranchName } from "./skills/implement/branch-name.js";
import { installSkills } from "./skills/install.js";
import { listInstalledAgents, listInstalledSkills } from "./skills/listing.js";
import { runDoctor } from "./skills/doctor.js";
import { installAgents } from "./agents/install.js";
import { promptForNamespace, writeBrandingJson } from "./branding/rebrand.js";
import { createInterface } from "node:readline/promises";
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
                      --brand=<name>     Scaffold a white-label deployment (branding.json,
                                         praise.config.json, .claude-plugin/plugin.json,
                                         .claude-plugin/marketplace.json) instead of CLAUDE.md.
                      --brand-slug=<s>   Override the derived slug (kebab-case).
                      --fork             Use marketplace strict:true (local fork copy).

  upgrade --upstream-ref=<ref> --framework-version=<x.y.z>
                    Re-point an existing brand deployment to a new upstream
                    framework release. Preserves BRAND_* config; refuses
                    unsigned upstream refs.

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

  skills list       List installed skills (user-invoked slash commands).
  agents list       List installed agents (dispatched workers, NOT slash
                    commands). See docs/skills-vs-agents.md.

  doctor            Read-only install & wiring diagnostic: brand slug, install
                    mode, token residue, hyphen-namespace coherence, both hooks,
                    CLAUDE.md budget, inert boundary gate. Exit 1 if blocking.

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

  drift analyze [--format json|html|console] [--incremental]
                    Audit tracked files against the checkable standards,
                    grouped by rule + directory, with delta vs the last run.

  arch-check check [--files a,b]   Block cross-boundary import violations
                    per .\${BRAND_SLUG}/architecture.yaml (monorepo-aware).
  arch-check init   Scaffold a starter .\${BRAND_SLUG}/architecture.yaml
                    (inert until you define layers/deny).
  arch-check except "<from>-><to>" --reason="..." --expires=<date>
                    Record a time-boxed boundary exception (expiry mandatory).

  standards history [--rule <id>]   Timeline of standards/rules changes
                    (author, date, message, PR link) from git history.
  standards as-of <date>            Reconstruct the effective standards
                    as they were on a given date (read-only).

  deploy --env <name> [--yes]       Run team-defined pre-flight checks,
                    deploy (production needs --yes), post-deploy health
                    check, and automatic rollback on health failure.

  explain <rule-id>                 Show the recorded rationale for a
                    standard rule (origin, reasoning, examples, incident
                    and research references).

  onboard [--user <n>] [--level <l>] [--advance|--ask "<q>"|--starter]
                    Guided onboarding: roadmap + per-developer progress
                    (pause/resume), local answers, starter-task suggestion.

  onboard-guide --role <frontend|backend|devops> [--user <n>]
                [--advance|--ask "<q>"]
                    Role-tailored interactive onboarding over the onboard
                    skill: module status, pause/resume, local-first completion.

  --version         Show version
  --help            Show this help

Documentation: https://github.com/kgn-git/praise
`.trim();
function parseInitArgs(rest) {
    let yes = false;
    let atRoot = false;
    let onExisting = "abort";
    let companion = true;
    let brand;
    let brandSlug;
    let fork = false;
    for (const arg of rest) {
        if (arg.startsWith("--brand=")) {
            brand = arg.slice("--brand=".length);
            continue;
        }
        if (arg.startsWith("--brand-slug=")) {
            brandSlug = arg.slice("--brand-slug=".length);
            continue;
        }
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
            case "--fork":
                fork = true;
                break;
            default:
                console.error(`Unknown option: ${arg}`);
                process.exit(1);
        }
    }
    return { yes, atRoot, onExisting, companion, brand, brandSlug, fork };
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
    if (args.brand !== undefined) {
        const framework = await loadFramework(PACKAGE_ROOT);
        return runDeployInit({
            brandName: args.brand,
            brandSlug: args.brandSlug,
            fork: args.fork,
            cwd: process.cwd(),
            frameworkRoot: PACKAGE_ROOT,
            frameworkSlug: framework.FRAMEWORK_SLUG,
            frameworkVersion: framework.FRAMEWORK_VERSION,
            upstreamRef: `v${framework.FRAMEWORK_VERSION}`,
            upstreamSource: { type: "github", repo: "kgn-git/3C" },
            installUuid: randomUUID(),
            runGit: defaultGitRunner,
            writeFile: async (p, c) => {
                await mkdir(dirname(p), { recursive: true });
                await writeFile(p, c, "utf8");
            },
            log: console.log.bind(console),
            err: console.error.bind(console),
        });
    }
    const framework = await loadFramework(PACKAGE_ROOT);
    // #240: when interactive and not branded via --brand, offer to set the
    // slash-command namespace (the hyphen brand prefix). Writes branding.json so
    // later `skills install` / `agents install` prefix every command and agent
    // (e.g. /acme-review). TTY-guarded so non-interactive runs never block.
    if (!args.yes && process.stdin.isTTY) {
        const existing = (await loadBrand(process.cwd())).BRAND_SLUG?.trim();
        if (!existing) {
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            try {
                const res = await promptForNamespace(framework.FRAMEWORK_SLUG, (q) => rl.question(q));
                if (res.ok && res.slug !== framework.FRAMEWORK_SLUG) {
                    const p = await writeBrandingJson(process.cwd(), res.slug);
                    console.log(`✓ namespace set to /${res.slug}-* (${p})`);
                }
                else if (!res.ok) {
                    console.warn(`⚠ keeping default namespace; invalid slug: ${res.errors.join("; ")}`);
                }
            }
            finally {
                rl.close();
            }
        }
    }
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
    console.log(`\nSkills and agents install under the /${brand.BRAND_SLUG}- namespace (e.g. /${brand.BRAND_SLUG}-review).`);
    console.log(`Re-run \`${brand.FRAMEWORK_SLUG} init\` and answer the namespace prompt, or set BRAND_SLUG in branding.json, to change it.`);
    return 0;
}
export async function runDeployInit(args) {
    const result = await scaffoldDeployment({
        brandName: args.brandName,
        brandSlug: args.brandSlug,
        cwd: args.cwd,
        frameworkRoot: args.frameworkRoot,
        frameworkSlug: args.frameworkSlug,
        frameworkVersion: args.frameworkVersion,
        upstreamRef: args.upstreamRef,
        upstreamSource: args.upstreamSource,
        installUuid: args.installUuid,
        strict: args.fork,
        orgMetadata: args.orgMetadata,
        runGit: args.runGit,
        writeFile: args.writeFile,
    });
    if (!result.ok) {
        for (const e of result.errors)
            args.err(`✗ ${e}`);
        return 1;
    }
    for (const p of result.written)
        args.log(`✓ ${p}`);
    return 0;
}
export async function runDeployUpgrade(args) {
    const result = await upgradeDeployment({
        newUpstreamRef: args.newUpstreamRef,
        newFrameworkVersion: args.newFrameworkVersion,
        cwd: args.cwd,
        frameworkRoot: args.frameworkRoot,
        runGit: args.runGit,
        readFile: args.readFile,
        writeFile: args.writeFile,
    });
    if (!result.ok) {
        for (const e of result.errors)
            args.err(`✗ ${e}`);
        return 1;
    }
    for (const p of result.written)
        args.log(`✓ ${p}`);
    return 0;
}
const defaultGitRunner = (gitArgs, opts) => new Promise((resolve) => {
    const child = spawn("git", [...gitArgs], { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
});
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
// #241: read-only discoverability. Skills are user-invoked slash commands;
// agents are dispatched workers (Task tool / auto-selection), never slash-run.
async function skillsListCommand() {
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
async function agentsListCommand() {
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
// #239: read-only install & wiring diagnostic. Exit 1 on a blocking issue.
async function doctorCommand() {
    const report = await runDoctor({
        workspaceDir: process.cwd(),
        packageRoot: PACKAGE_ROOT,
    });
    for (const f of report.findings) {
        const icon = f.level === "ok" ? "✓" : f.level === "warn" ? "⚠" : "✗";
        console.log(`${icon} [${f.check}] ${f.message}`);
    }
    console.log(report.ok
        ? "\n✓ doctor: no blocking issues."
        : "\n✗ doctor: blocking issue(s) found — see ✗ above.");
    return report.ok ? 0 : 1;
}
// #256: reconcile multi-agent review findings into one board report. Reads a
// `{ agent: Finding[] }` JSON from stdin or --file; used by /3c-review-board.
async function reconcileCommand(argv) {
    const file = flagValue(argv, "--file");
    let json;
    if (file) {
        json = await readFile(file, "utf8");
    }
    else {
        const chunks = [];
        for await (const chunk of process.stdin)
            chunks.push(chunk);
        json = Buffer.concat(chunks).toString("utf-8");
    }
    try {
        process.stdout.write(reconcileFromJson(json));
    }
    catch (e) {
        console.error(`reconcile: invalid findings JSON: ${e.message}`);
        return 1;
    }
    return 0;
}
// #262: cross-project dependency ledger ops for /3c-programme-manager.
async function depsCommand(argv) {
    const ws = process.cwd();
    const sub = argv[0];
    const graph = await loadGraph(ws);
    if (sub === "order") {
        const t = flagValue(argv, "--target");
        const target = t ? t.split(",").filter(Boolean) : undefined;
        const r = resolveOrder(graph, target);
        if (!r.ok) {
            console.error(`✗ dependency cycle: ${r.cycle.join(" -> ")}`);
            return 1;
        }
        const hasDeps = new Set(graph.edges.map((e) => e.from));
        const readyNow = r.order.filter((id) => !hasDeps.has(id));
        console.log(r.order.length ? r.order.join("\n") : "(no projects found)");
        if (readyNow.length)
            console.log(`\nready now: ${readyNow.join(", ")}`);
        return 0;
    }
    if (sub === "validate") {
        const r = resolveOrder(graph);
        if (!r.ok) {
            console.error(`✗ dependency cycle: ${r.cycle.join(" -> ")}`);
            return 1;
        }
        console.log(`✓ ${graph.projects.length} project(s), ${graph.edges.length} edge(s); no cycles.`);
        return 0;
    }
    if (sub === "add") {
        const from = flagValue(argv, "--from");
        const to = flagValue(argv, "--to");
        const reason = flagValue(argv, "--reason");
        const source = flagValue(argv, "--source");
        if (!from || !to) {
            console.error("Usage: deps add --from=<id> --to=<id> [--reason=...] [--source=...]");
            return 1;
        }
        const r = addEdge(graph, {
            from,
            to,
            ...(reason ? { reason } : {}),
            ...(source ? { source } : {}),
        });
        if (!r.ok) {
            console.error(`✗ ${r.error}`);
            return 1;
        }
        await mkdir(join(ws, ".3c"), { recursive: true });
        await writeFile(join(ws, ".3c", "dependencies.yaml"), serialize(r.graph), "utf8");
        console.log(`✓ recorded ${from} -> ${to} in .3c/dependencies.yaml`);
        return 0;
    }
    console.log("Usage: deps <order [--target=<id,...>] | validate | add --from --to [--reason --source]>");
    return 1;
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
        const FRAMEWORKS = [
            "jest",
            "vitest",
            "pytest",
            "mocha",
            "playwright",
            "junit",
        ];
        let framework;
        let sourcePath;
        let mode = "unit";
        const extraSources = [];
        for (const arg of rest) {
            if (arg.startsWith("--framework=")) {
                const v = arg.slice("--framework=".length);
                if (FRAMEWORKS.includes(v))
                    framework = v;
            }
            else if (arg.startsWith("--type=")) {
                const v = arg.slice("--type=".length);
                if (v === "integration" || v === "unit")
                    mode = v;
            }
            else if (!arg.startsWith("--")) {
                if (sourcePath === undefined)
                    sourcePath = arg;
                else
                    extraSources.push(arg);
            }
        }
        if (framework === undefined || sourcePath === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} test scaffold <source-path> [extra-sources...] --framework={${FRAMEWORKS.join("|")}} [--type=integration]`);
            return 1;
        }
        const result = await scaffoldTest({
            framework,
            sourcePath,
            workspaceDir: process.cwd(),
            mode,
            extraSources,
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
    // #70: route through the bundled MCP PM server when a non-GitHub tool is
    // configured (or --tool=); otherwise the unchanged gh path (AC7).
    let toolFlag;
    for (const a of rest) {
        if (a.startsWith("--tool="))
            toolFlag = a.slice("--tool=".length);
    }
    const { resolvePmSelection } = await import("./mcp/pm/select.js");
    const sel = await resolvePmSelection(process.cwd(), toolFlag);
    let pmRouter;
    if (sel) {
        const { pmCreateIssue } = await import("./mcp/pm/registry.js");
        const { defaultResolver } = await import("./hooks/credentials.js");
        const http = async (req) => {
            const resp = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                ...(req.body !== undefined ? { body: req.body } : {}),
            });
            return { status: resp.status, body: await resp.text() };
        };
        pmRouter = async (p) => pmCreateIssue(p, {
            tool: sel.tool,
            http,
            resolver: defaultResolver,
            baseUrl: sel.baseUrl,
            project: sel.project,
            tokenRef: sel.tokenRef,
        });
    }
    const result = await createIssue(payload, {
        force,
        ...(pmRouter ? { pmRouter } : {}),
    });
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
// #180 VP-03-F08-ext: personal, local, read-only insights. No network,
// no backend, no team/comparison data — own workstation telemetry only.
export async function dashboardCommand(argv, env = { cwd: process.cwd() }) {
    let since;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--since")
            since = argv[i + 1];
        else if (a?.startsWith("--since="))
            since = a.slice("--since=".length);
    }
    const cfg = await loadTelemetryConfig(env.cwd);
    if (!cfg.enabled) {
        console.log("Nothing to show — telemetry is disabled.");
        return 0;
    }
    const win = parseWindow(since, cfg.retentionDays);
    const records = await readEventsInWindow(env.cwd, win.days, env.now ?? new Date());
    if (records.length === 0) {
        console.log(`Nothing to show — no telemetry in the ${win.label}.`);
        return 0;
    }
    const html = renderDashboardHtml(dashboardMetrics(records), win.label);
    const out = join(env.cwd, `.${resolveBrandSlugSync()}`, "dashboard.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
    console.log(`Wrote ${out}`);
    if (env.open)
        await env.open(out);
    return 0;
}
// #17 VP-03-F03: pre-PR coverage gate. Exit 2 when blocked, 0 otherwise.
export async function coverageGateCommand(_argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const r = await runCoverageGate(env.cwd, env.runner ? { runner: env.runner } : {});
    if (r.blocked) {
        log(r.message);
        return 2;
    }
    log(`Coverage gate passed (${r.coveragePct}% changed-line coverage).`);
    return 0;
}
// #18 VP-03-F04: pre-commit security scan gate + recorded suppressions.
export async function securityCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "scan") {
        const r = await runSecurityGate(env.cwd, {
            ...(env.scanner ? { scanner: env.scanner } : {}),
            ...(env.runner ? { runner: env.runner } : {}),
        });
        log(r.message);
        return r.blocked ? 2 : 0;
    }
    if (sub === "suppress") {
        const id = argv[1];
        let reason;
        for (const a of argv.slice(2)) {
            if (a.startsWith("--reason="))
                reason = a.slice("--reason=".length);
        }
        if (!id || !reason) {
            log('Usage: security suppress <id> --reason="<why>"');
            return 1;
        }
        await addSuppression(env.cwd, id, reason);
        log(`Suppressed ${id} — recorded: ${reason}`);
        return 0;
    }
    log("Usage: security <scan|suppress>");
    return 1;
}
// #11 VP-01-F06: inspect the dynamically-loaded context for a file.
export async function debugCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    if (argv[0] !== "context") {
        log("Usage: debug context [file]");
        return 1;
    }
    const file = argv[1] ?? env.cwd;
    const c = await loadDynamicContext(env.cwd, file);
    log(`Active rules (${c.rules.length}):`);
    for (const r of c.rules)
        log(`  - ${r.filename}`);
    log(`Instruction count: ${c.instructionCount} / 150`);
    log(`Remaining budget: ${c.remainingBudget}`);
    if (c.debugLog.length > 0) {
        log("Budget drops:");
        for (const d of c.debugLog)
            log(`  ${d}`);
    }
    return 0;
}
function bugFlag(argv, name) {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
}
// #14 VP-02-F07: structured bug report filed via the create-issue path.
export async function bugCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const attachments = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--attach" && argv[i + 1])
            attachments.push(argv[i + 1]);
    }
    const input = {
        summary: bugFlag(argv, "--summary"),
        reproSteps: bugFlag(argv, "--repro"),
        expected: bugFlag(argv, "--expected"),
        actual: bugFlag(argv, "--actual"),
        environment: bugFlag(argv, "--env"),
        severity: bugFlag(argv, "--severity"),
        suspectedRootCause: bugFlag(argv, "--root-cause"),
        attachments,
    };
    const r = await runBugReport(input, env.cwd, env.spawn ? { spawn: env.spawn } : {});
    if (!r.filed) {
        if (r.missing)
            log(`Missing required: ${r.missing.join(", ")}`);
        else
            log(`Bug report not filed${r.warnings?.length ? " (preflight warnings)" : ""}.`);
        return 1;
    }
    log(`Filed: ${r.ref?.url ?? "(ok)"}`);
    return 0;
}
// #10 VP-01-F05: on-demand standards drift audit (reportorial, not a gate).
export async function driftCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    if (argv[0] !== "analyze") {
        log("Usage: drift analyze [--format json|html|console] [--incremental]");
        return 1;
    }
    const fi = argv.indexOf("--format");
    const fmt = fi >= 0 ? argv[fi + 1] : undefined;
    const format = fmt === "json" || fmt === "html" ? fmt : "console";
    const incremental = argv.includes("--incremental");
    try {
        const r = await runDrift(env.cwd, { format, incremental });
        log(r.formatted);
        if (r.delta.hasPrevious) {
            const moved = Object.entries(r.delta.byRule).filter(([, n]) => n !== 0);
            if (moved.length > 0) {
                log("Delta vs previous run:");
                for (const [rule, n] of moved) {
                    log(`  ${rule}: ${n > 0 ? "+" : ""}${n}`);
                }
            }
        }
        return 0;
    }
    catch (e) {
        // NFR-USE-03: explain + remediation; reportorial command never half-reports.
        log(`drift analyze failed: ${e.message}`);
        return 1;
    }
}
function flagValue(argv, name) {
    for (const a of argv) {
        if (a.startsWith(`${name}=`))
            return a.slice(name.length + 1);
    }
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
}
// #19 VP-03-F05: architecture boundary gate (mirrors `security scan`).
export async function archCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "check") {
        const filesArg = flagValue(argv, "--files");
        const changedFiles = filesArg
            ? filesArg.split(",").filter((f) => f !== "")
            : undefined;
        const bypassToken = await consumeBypassToken(env.cwd);
        const r = await runArchBoundary(env.cwd, {
            ...(changedFiles ? { changedFiles } : {}),
            bypassToken,
        });
        if (r.notConfigured) {
            const slug = resolveBrandSlugSync();
            log(`architecture boundary gate not configured — no .${slug}/architecture.yaml. ` +
                `Run \`${slug} arch-check init\` to scaffold a starter (advisory; not blocking).`);
            return 0;
        }
        if (r.message !== "")
            log(r.message);
        return r.blocked ? 2 : 0;
    }
    if (sub === "init") {
        const slug = resolveBrandSlugSync();
        const r = await writeStarterArchConfig(env.cwd, slug);
        log(r.created
            ? `Scaffolded ${r.path} — an inert starter; define layers/deny to activate the gate.`
            : `${r.path} already exists — left unchanged.`);
        return 0;
    }
    if (sub === "except") {
        const key = argv[1];
        const reason = flagValue(argv, "--reason");
        const expires = flagValue(argv, "--expires");
        if (!key || !reason || !expires) {
            log('Usage: arch-check except "<from>-><to>" --reason="<why>" --expires=<date>');
            return 1;
        }
        try {
            await addException(env.cwd, key, reason, expires);
            log(`Exception recorded for ${key} — expires ${expires}`);
            return 0;
        }
        catch (e) {
            log(`Could not record exception: ${e.message}`);
            return 1;
        }
    }
    log("Usage: arch-check <check|except|init>");
    return 1;
}
// #21 VP-01-F09: git-native standards version history (read-only).
export async function standardsCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "history") {
        const ruleIdx = argv.indexOf("--rule");
        const rule = ruleIdx >= 0 ? argv[ruleIdx + 1] : undefined;
        const r = await runStandardsHistory(env.cwd, rule ? { rule } : {});
        if (!r.ok) {
            log(r.error);
            return 1;
        }
        if (r.entries.length === 0) {
            log("No standards changes recorded.");
            return 0;
        }
        for (const e of r.entries) {
            const subject = e.message.split("\n")[0] ?? "";
            const pr = e.pr ? ` [PR ${e.pr}]` : "";
            log(`${e.commit.slice(0, 9)} ${e.date} ${e.author} — ${subject}${pr}`);
        }
        return 0;
    }
    if (sub === "as-of") {
        const date = argv[1];
        if (!date) {
            log("Usage: standards as-of <date>");
            return 1;
        }
        const r = await runStandardsAsOf(env.cwd, date);
        if (!r.ok) {
            log(r.error);
            return 1;
        }
        log(`Effective standards as of ${date} (commit ${r.commit.slice(0, 9)}):`);
        for (const m of r.manifest)
            log(`  ${m.path}`);
        return 0;
    }
    log("Usage: standards <history [--rule <id>]|as-of <date>>");
    return 1;
}
// #12 VP-02-F05: deployment orchestrator skill — runs the safety-gate
// sequence and shells out to the team's deploy/rollback/health commands.
export async function deployCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const ei = argv.indexOf("--env");
    const envName = ei >= 0 ? (argv[ei + 1] ?? "") : "";
    const confirmed = argv.includes("--yes") || argv.includes("-y");
    if (envName === "") {
        log("Usage: deploy --env <name> [--yes]");
        return 1;
    }
    const defaultRunner = async (command) => {
        const { exec } = await import("node:child_process");
        const { promisify } = await import("node:util");
        try {
            await promisify(exec)(command, { cwd: env.cwd });
            return { exitCode: 0 };
        }
        catch (e) {
            return { exitCode: e.code ?? 1 };
        }
    };
    const defaultGit = async (args) => {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        try {
            const { stdout } = await promisify(execFile)("git", [...args], {
                cwd: env.cwd,
            });
            return stdout;
        }
        catch {
            return "";
        }
    };
    const r = await runDeploy(env.cwd, {
        envName,
        confirmed,
        runner: env.runner ?? defaultRunner,
        gitRunner: env.gitRunner ?? defaultGit,
    });
    log(r.message);
    if (r.deployed)
        return 0;
    return 1;
}
// #24 VP-06-F03: surface the co-versioned rationale for a standard rule.
export async function explainCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const ruleId = argv[0];
    if (!ruleId) {
        log("Usage: explain <rule-id>");
        return 1;
    }
    const r = await resolveRationale(env.cwd, ruleId);
    if (!r.found) {
        log(`No rationale recorded for "${ruleId}". Known rule ids: ${r.knownRuleIds.join(", ") || "(none)"}`);
        return 1;
    }
    log(formatRationale(r.ruleId, r.rationale));
    return 0;
}
// #15 VP-02-F09: guided onboarding skill (primitive; #22 layers over it).
export async function onboardCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const user = flagValue(argv, "--user") ?? userInfo().username;
    const level = flagValue(argv, "--level");
    const ask = flagValue(argv, "--ask");
    const action = ask
        ? "ask"
        : argv.includes("--advance")
            ? "advance"
            : argv.includes("--starter")
                ? "starter"
                : undefined;
    const realSpawn = async (cmd, a) => {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        try {
            const { stdout, stderr } = await promisify(execFile)(cmd, [...a], {
                cwd: env.cwd,
            });
            return { exitCode: 0, stdout, stderr };
        }
        catch (e) {
            const x = e;
            return {
                exitCode: x.code ?? 1,
                stdout: x.stdout ?? "",
                stderr: x.stderr ?? "",
            };
        }
    };
    const r = await runOnboard(env.cwd, {
        user,
        ...(level ? { level } : {}),
        ...(action ? { action } : {}),
        ...(ask ? { query: ask } : {}),
        ...(action === "starter" ? { spawn: realSpawn } : {}),
    });
    log(`Onboarding — ${user}`);
    for (const m of r.roadmap) {
        const mark = r.progress.completed.includes(m.id)
            ? "[x]"
            : r.progress.current === m.id
                ? "[>]"
                : "[ ]";
        log(`  ${mark} ${m.id} — ${m.title}`);
    }
    if (r.progress.current)
        log(`Current: ${r.progress.current}`);
    else
        log("All modules complete.");
    if (r.answer)
        log(`\n${r.answer}`);
    if (r.starter)
        log(`\nStarter task: #${r.starter.number} — ${r.starter.title}`);
    return 0;
}
// #22 VP-06-F01: role-tailored interactive onboarding guide (layers over #15).
export async function onboardGuideCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const user = flagValue(argv, "--user") ?? userInfo().username;
    const role = flagValue(argv, "--role") ?? "generic";
    const ask = flagValue(argv, "--ask");
    const action = ask
        ? "ask"
        : argv.includes("--advance")
            ? "advance"
            : undefined;
    const r = await runOnboardGuide(env.cwd, {
        user,
        role,
        ...(action ? { action } : {}),
        ...(ask ? { query: ask } : {}),
    });
    log(`Onboarding guide — ${user} (${role})`);
    for (const m of r.roadmap) {
        const mark = r.status.completed.includes(m.id)
            ? "[x]"
            : r.status.inProgress === m.id
                ? "[>]"
                : "[ ]";
        log(`  ${mark} ${m.id} — ${m.title}`);
    }
    if (r.completedAll)
        log("Onboarding complete — completion recorded locally.");
    else if (r.status.inProgress)
        log(`Current: ${r.status.inProgress}`);
    if (r.answer)
        log(`\n${r.answer}`);
    return 0;
}
export async function main(argv) {
    const command = argv[0];
    if (command === "--version" || command === "-v") {
        console.log(VERSION);
        return 0;
    }
    if (command === "init") {
        const args = parseInitArgs(argv.slice(1));
        return initCommand(args);
    }
    if (command === "upgrade") {
        const rest = argv.slice(1);
        let newRef;
        let newVersion;
        for (const arg of rest) {
            if (arg.startsWith("--upstream-ref=")) {
                newRef = arg.slice("--upstream-ref=".length);
            }
            else if (arg.startsWith("--framework-version=")) {
                newVersion = arg.slice("--framework-version=".length);
            }
            else {
                console.error(`Unknown option: ${arg}`);
                return 1;
            }
        }
        if (!newRef || !newVersion) {
            console.error("upgrade requires --upstream-ref=<ref> and --framework-version=<x.y.z>");
            return 1;
        }
        return runDeployUpgrade({
            newUpstreamRef: newRef,
            newFrameworkVersion: newVersion,
            cwd: process.cwd(),
            frameworkRoot: PACKAGE_ROOT,
            runGit: defaultGitRunner,
            readFile: async (p) => readFile(p, "utf8"),
            writeFile: async (p, c) => writeFile(p, c, "utf8"),
            log: console.log.bind(console),
            err: console.error.bind(console),
        });
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
    if (command === "skills" && argv[1] === "list") {
        return skillsListCommand();
    }
    if (command === "agents" && argv[1] === "install") {
        return agentsInstallCommand(argv.slice(2));
    }
    if (command === "agents" && argv[1] === "list") {
        return agentsListCommand();
    }
    if (command === "doctor") {
        return doctorCommand();
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
    if (command === "coverage-gate") {
        return coverageGateCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "security") {
        return securityCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "debug") {
        return debugCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "bug") {
        return bugCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "drift") {
        return driftCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "reconcile") {
        return reconcileCommand(argv.slice(1));
    }
    if (command === "deps") {
        return depsCommand(argv.slice(1));
    }
    if (command === "arch-check") {
        return archCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "standards") {
        return standardsCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "deploy") {
        return deployCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "explain") {
        return explainCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "onboard") {
        return onboardCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "onboard-guide") {
        return onboardGuideCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "dashboard") {
        const realOpen = async (p) => {
            if (process.env.CI || process.env.VITEST || !process.stdout.isTTY)
                return;
            const { spawn } = await import("node:child_process");
            const plat = process.platform;
            const cmd = plat === "win32" ? "cmd" : plat === "darwin" ? "open" : "xdg-open";
            const args = plat === "win32" ? ["/c", "start", "", p] : [p];
            spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
        };
        return dashboardCommand(argv.slice(1), {
            cwd: process.cwd(),
            open: realOpen,
        });
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
// Run only when executed directly (e.g. the `3c` bin / `node dist/cli.js`),
// not when imported (tests import `main`/`dashboardCommand`).
const invokedPath = process.argv[1];
if (invokedPath !== undefined &&
    import.meta.url === pathToFileURL(invokedPath).href) {
    const exitCode = await main(process.argv.slice(2));
    process.exit(exitCode);
}
//# sourceMappingURL=cli.js.map