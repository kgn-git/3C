#!/usr/bin/env node
// #448: FIRST, so the fatal handlers are live before any other module loads.
import "./cli/fatal-boot.js";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadFramework, resolveBrand } from "./branding/load.js";
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
import { readHandovers } from "./dashboard/handover.js";
import { deliveryMetrics } from "./dashboard/delivery.js";
import { startDashboardServer, DEFAULT_PORT, } from "./dashboard/server.js";
import { renderConsole } from "./output/index.js";
import { runSecurityGate } from "./security/index.js";
import { addSuppression } from "./security/suppress.js";
import { loadDynamicContext } from "./context/loader.js";
import { createIssue } from "./skills/create-issue.js";
import { runBugReport } from "./skills/bug/index.js";
import { runArchBoundary } from "./skills/arch-boundary/index.js";
import { addException } from "./validate/arch-exceptions-write.js";
import { writeStarterArchConfig } from "./skills/arch-boundary/scaffold.js";
import { runArchDiscover } from "./skills/arch-boundary/discover.js";
import { archConfigPath, clampLabel, isGateInert, loadArchConfig, } from "./validate/arch-config.js";
import { reconcileFromJson } from "./orchestration/reconcile.js";
import { loadGraph, resolveOrder, addEdge, serialize } from "./orchestration/deps.js";
import { forConsole, runOnboard } from "./skills/onboard/index.js";
import { onboardNextLines } from "./skills/onboard/present.js";
import { KNOWN_ROLES, excerptBody, isKnownRole } from "./skills/onboard/roadmap.js";
import { OnboardPathError, isSafeUser, normaliseDefaultUser, } from "./skills/onboard/user-path.js";
import { createPr } from "./skills/implement/create-pr.js";
import { fetchIssue } from "./skills/implement/fetch-issue.js";
import { formatBranchName } from "./skills/implement/branch-name.js";
import { installSkills } from "./skills/install.js";
import { runSetup } from "./cli/setup.js";
import { listInstalledAgents, listInstalledSkills } from "./skills/listing.js";
import { runDoctor } from "./skills/doctor.js";
import { installAgents } from "./agents/install.js";
import { hookPathGuardCli } from "./cli/hook-path-guard.js";
import { detectFramework } from "./skills/test/detect-framework.js";
import { writeTest } from "./skills/test/write.js";
import { loadTestMap, selectTests, selectionCommands, isSafeRef, } from "./skills/test/select.js";
import { applyRules } from "./rules/apply.js";
import { discoverWorkspaceFiles } from "./rules/discover.js";
import { installRulePack } from "./rules/install-pack.js";
import { scanConflicts } from "./validate/conflicts.js";
import { countInstructions } from "./validate/instruction-count.js";
import { validateOutput } from "./validate/output-validity.js";
import { scanSecrets } from "./validate/secrets.js";
import { scanSecretsCli } from "./cli/scan-secrets.js";
import { hookRunEvent, installFatalHandlers, reportFatal } from "./cli/fatal.js";
import { readErrorCode, readStdinBounded, StdinTooLargeError } from "./validate/_stdin.js";
import { DEFAULT_SELECTIONS, runWizard } from "./wizard/runner.js";
import { VERSION } from "./index.js";
import { createBackup } from "./install/backup.js";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// #401 board r1: one owner for the sentence two surfaces print for the same
// precondition (`rules apply` and `arch-check discover` both walk git).
// Placed ABOVE the retirement JSDoc so that doc block keeps annotating the
// map it documents (board r2).
const GIT_INIT_REMEDIATION = "Run `git init` first, or commit your initial files.";
/**
 * What to tell someone who types a verb this framework retired.
 *
 * Keyed by the bare verbs in `RETIRED_COMMANDS` (src/skills/cli-compat.ts) —
 * a retirement registers there for `doctor`, and adds its one sentence here
 * for the person at the shell. The two are checked against each other by
 * `tests/skills/drift-retired.test.ts`, so a verb cannot be retired into one
 * surface and forgotten in the other.
 */
const RETIREMENT_REPLACEMENTS = {
    drift: "Layer-boundary checking is what survived it: run `arch-check check`, and see the boundary panel of `dashboard` for the history.",
    // #395. Honest about what exists: no rationale file ever shipped for it to
    // resolve, and the packs cite unevenly — 24 of the 36 bundled rules carry no
    // source URL: the CWE pack cites CWE ids, and 9 of the 14 pattern files cite
    // nothing (the other 5 cite a book or author, never a URL). So this must not
    // promise a "Source line" — it points at the rule file itself.
    explain: "No rationale files ever shipped for it to resolve. The reasoning that exists lives in each rule file itself — open .claude/rules/<pack>/<rule>.md.",
    // #396. The LOCAL route, matching strategy/marketing/uninstall-upgrade.md —
    // not `npm install -g`. `doctor`'s existing upgrade line is a different
    // flavour and fires only on version skew; this is what the person who typed
    // the verb needs, and `upgrade` is the most guessable name for the operation
    // people actually perform, so a bare "Unknown command" here is the dead-end
    // the retirement would otherwise create.
    //
    // `--replace` is load-bearing and was MISSING in the first draft of this
    // sentence. Whoever types `3c upgrade` is by definition an EXISTING adopter,
    // and a plain `setup` "Re-runs ADD what is missing and skip what exists"
    // (HELP_TEMPLATE below) — so it exits 0 having refreshed nothing, while every
    // installed skill still invokes the verbs this epic retired. That is #406's
    // defect reproduced inside the recovery message for it.
    upgrade: "It verified a git tag inside a package directory npm installs with no .git, so it refused for every adopter. Re-install the release, then refresh the copied artefacts: `npm install git+https://github.com/kgn-git/3C.git#<release-sha>` (the commit sha from the release notes) then `${FRAMEWORK_SLUG} setup --replace` (a plain `setup` only adds what is missing). `${FRAMEWORK_SLUG} doctor` afterwards reports any skill still invoking a retired command.",
    // #396. Retired as a GROUP: `history` and `as-of` both went. `as-of` fetched
    // every file's content over N git subprocesses to print filenames, and
    // neither is named anywhere in templates/. Deliberately NOT relocated to a
    // `rules history` verb — a fold would move a dead-end rather than close one.
    standards: "The rules themselves are the record, and git already holds their history: `git log -- .claude/rules/`. Run `rules apply` to re-resolve the `load: inject` ones into CLAUDE.md; the rest Claude Code loads from .claude/rules/ itself.",
    // #396. `--env staging` and `--env prod` shelled out to byte-identical
    // strings, so the flag implied a selection it never made.
    deploy: "It sequenced shell commands you supplied, with no per-environment command of its own. Run them from your own pipeline; `arch-check check` and `security scan` are the gates worth keeping in front of a release.",
    // #396. Nothing invoked it and nothing fed it: no toolchain here or in a
    // fresh `setup` writes coverage-final.json, so on the empty fallback map
    // every changed line read as uncovered. Re-filed whole as #432.
    "coverage-gate": "Nothing ever fed it — no `setup` produces a coverage report for it to read, so it measured an empty map. Use your test runner's own coverage threshold; the capability is re-filed as #432.",
    // #399. A FOLD, not a deletion — the capability survives as a flag, so this
    // sentence has to hand the reader the replacement rather than explain a loss.
    // The two verbs shared one state file and wrote conflicting meanings into its
    // `level` field, so running either after the other re-seeded the other's
    // record. Role modules keep their ids across the fold, which is what lets an
    // in-flight record migrate instead of being invalidated.
    "onboard-guide": "It has been folded into `${FRAMEWORK_SLUG} onboard --role <frontend|backend|devops>`, which reads the project the way the guide never did — role modules are appended to the CLAUDE.md/scripts roadmap rather than replacing it. Progress carries over: your role is read from the record you already have.",
};
export const HELP_TEMPLATE = `
\${BRAND_NAME} — \${BRAND_LONG}

Usage:
  \${FRAMEWORK_SLUG} <command> [options]

Commands:
  setup [--yes] [--replace]
                    One-shot install: CLAUDE.md + rules (owasp-top-10) + hook
                    + skills + agents + inert arch-check, then a doctor verify.
                    A thin sequencer over the individual commands below. Re-runs
                    ADD what is missing and skip what exists; pass \`--replace\`
                    to refresh skills/agents that CHANGED upstream (it overwrites
                    your edits). \`--yes\` is non-interactive. (Alias: \`init --all\`.)
                    Every \`--replace\` (here and below) first backs up each
                    file it overwrites to .\${BRAND_SLUG}/backups/<timestamp>/.

  init [options]    Initialize CLAUDE.md for this project
                      --yes              Use defaults; no prompts
                      --at-root          Write to ./CLAUDE.md (default is ./.claude/CLAUDE.md)
                      --replace          Overwrite if file exists
                      --merge            Backup-and-overwrite (writes .pre-\${BRAND_SLUG}.bak)
                      --no-companion     Skip CLAUDE.local.md.example + .gitignore update

  rules apply       Validate .claude/rules/**/*.md and inject the rules marked
                    \`load: inject\` whose globs match workspace files into
                    CLAUDE.md. Rules marked \`load: disk\` (the default) stay
                    in .claude/rules/, which Claude Code loads on its own;
                    CLAUDE.md names those packs. Refuses to write a CLAUDE.md
                    of 150 or more directives. Re-runnable; replaces the
                    previous rules block in place.

  rules install <pack> [--replace]
                    Install a bundled rule pack into .claude/rules/<pack>/.
                    Packs: security/owasp-top-10, security/cwe-top-25-2025 (on
                    disk); patterns/clean-architecture, patterns/hexagonal,
                    patterns/layered-mvc, patterns/microservices,
                    patterns/modular-monolith (injected).
                    Run \`rules apply\` afterwards.

  hook install      Register the \${BRAND_NAME} hooks in .claude/settings.json:
                    the PreToolUse commit gate and path-guard, and the
                    PostToolUse post-edit check. Safe to re-run — it adds what
                    is missing and leaves other tools' entries alone.

  hook run [--event=<event>]
                    Internal — invoked by Claude Code via the registered
                    hook. Reads the event payload from stdin. On PreToolUse it
                    runs the configured chain from .\${BRAND_SLUG}/hooks.yaml;
                    on PostToolUse it runs the post-edit boundary check, which
                    is advisory and never blocks the edit.

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
                    Installs the 3C crew: architect, code-reviewer,
                    journey-architect, product-owner, qa-reviewer,
                    security-reviewer, test-author, ux-expert.

  skills list       List installed skills (user-invoked slash commands).
  agents list       List installed agents (dispatched workers, NOT slash
                    commands). See https://kgn-git.github.io/3C/skills-vs-agents.html

  doctor            Read-only install & wiring diagnostic: brand slug, install
                    mode, token residue, hyphen-namespace coherence, every
                    registered hook (PreToolUse and PostToolUse), CLAUDE.md
                    budget, inert boundary gate. Exit 1 if blocking.

  test select [--files=a,b] [--base=<ref>] [--json]
                    Print the command(s) the TDD loop should run for the
                    current changeset, and why. Sources go to the runner's
                    related-mode; inputs that tests READ rather than import
                    are resolved via .\${BRAND_SLUG}/test-map.json. Anything
                    unmapped, or any failure to read the changeset from git,
                    widens the run to the full suite: a narrowed run never
                    reports green on tests it did not run. Inner loop only —
                    the pre-PR gate always runs everything.

  test write <target-path>
                    Read content from stdin, write to target-path with
                    secret-scan + path-traversal + no-overwrite guards.

  test detect-framework [<workspace>]
                    Internal — the runner resolution \`test select\` performs
                    in-process, exposed as a verb for the /\${BRAND_SLUG}-test
                    and /\${BRAND_SLUG}-implement skills. Prints the detected
                    framework (vitest|jest|mocha|playwright|pytest|junit|unknown)
                    as JSON. Exit 0 on known, 1 on unknown.

  create-issue [--force]
                    Internal — runtime helper for the create-issue skill.
                    Reads an IssuePayload JSON object from stdin, runs
                    preflight checks, and shells out to \`gh issue create\`.

  implement fetch-issue <id> [--repo=<owner/name>]
                    Internal — fetch an issue via \`gh issue view --json\`
                    and emit FetchedIssue JSON on stdout. Used by
                    /\${BRAND_SLUG}-implement for AC1.

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
                    to stdout. Exits 0 even on a hit, so /\${BRAND_SLUG}-review
                    and /\${BRAND_SLUG}-implement can redact and continue;
                    pass --fail-on-hit to exit 1 instead, for hooks and
                    scripts that gate on the exit status.

  security scan [--base=<ref>]      Scan the change for leaked secrets and
                    added dependencies with known advisories. Reads unstaged,
                    staged, untracked and committed-since-merge-base files;
                    fails closed if the tree cannot be read.
  security suppress <id>            Record an accepted finding so it stops
                    blocking. Suppressions are local to this workspace.

  dashboard [--serve] [--port <n>] [--since <date>]
                    Delivery view built from handover frontmatter: issues
                    shipped, cycle time, board verdicts. Writes a static
                    .\${BRAND_SLUG}/dashboard.html, or serves it on loopback
                    with --serve.

  debug context [file]              Print what the assistant reads for a
                    file — the rules, standards and architecture in scope —
                    so an unexpected suggestion can be traced to its source.

  bug --summary "<s>" --repro "<r>" --expected "<e>" --actual "<a>"
      [--env "<e>"] [--attach <path>]
                    File a structured bug report against this project.
                    Secrets are redacted from every field before it is sent.

  arch-check check [--files a,b]   Block cross-boundary import violations
                    per .\${BRAND_SLUG}/architecture.yaml (monorepo-aware).
                    Exit 0 clean or not configured, 1 could not evaluate
                    (config or file list), 2 violations.
  arch-check init   Scaffold a starter .\${BRAND_SLUG}/architecture.yaml
                    (inert until you define layers/deny).
  arch-check discover   Draft .\${BRAND_SLUG}/architecture.yaml from the
                    repository's actual import graph (proposal-only when an
                    active config exists).
  arch-check except "<from>-><to>" --reason="..." --expires=<date>
                    Record a time-boxed boundary exception (expiry mandatory).

  reconcile [--file <path>]         Internal — invoked by the
                    /\${BRAND_SLUG}-review-board skill. Reads multi-agent review
                    findings JSON from stdin (or --file) and emits the
                    deterministic de-duped, ranked board verdict.
  deps order [--file <path>]        Internal — dependency-ordered issue
                    sequence, used by /\${BRAND_SLUG}-programme-manager.

  onboard [--user <n>] [--level <l>] [--role <frontend|backend|devops>]
          [--advance|--ask "<q>"|--starter]
                    Guided onboarding: roadmap + per-developer progress
                    (pause/resume), local answers, starter-task suggestion.
                    --role appends role modules to the project-derived roadmap
                    and is remembered, so resuming needs no flag.

  --version         Show version
  --help            Show this help

Documentation: https://kgn-git.github.io/3C/
`.trim();
// #451: `--brand` / `--brand-slug` are gone with custom branding. They fall to
// the generic unknown-option refusal below — no released adopter exists to
// redirect, so no retired-flag message is built.
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
/**
 * #329: what a terminal-less init tells its caller — the defaults it applied,
 * and the route to choose differently. `setup --replace` is NOT that route:
 * it never reaches init (#406), so it cannot change these answers.
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
async function initCommand(args) {
    // #451: no namespace question. The #240 prompt offered to rename the
    // slash-command prefix by writing `branding.json`; custom branding is
    // retired, so every install is `/3c-*` and there is nothing to ask.
    const brand = resolveBrand(await loadFramework(PACKAGE_ROOT));
    console.log(`${brand.BRAND_NAME} init — generating CLAUDE.md (framework ${brand.FRAMEWORK_NAME} v${brand.FRAMEWORK_VERSION})`);
    // #329: with no terminal there is nobody to answer — a container, a CI job,
    // a script onboarding many repos. The wizard died at its first prompt there
    // ("User force closed the prompt"), and plain `setup` stopped at step 1.
    // A missing terminal now means the defaults, SAID OUT LOUD (stderr, so a CI
    // parser reading stdout sees only the run). It only skips prompts: nothing
    // here reaches --replace, so no adopter file is overwritten (AC4/AC7/AC8).
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
    // #452: --replace and --merge both overwrite CLAUDE.md, so both take a
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
async function rulesApplyCommand() {
    const framework = await loadFramework(PACKAGE_ROOT);
    const brand = resolveBrand(framework);
    console.log(`${brand.BRAND_NAME} rules apply — resolving \`.claude/rules/*.md\` (framework ${brand.FRAMEWORK_NAME} v${brand.FRAMEWORK_VERSION})`);
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
async function hookRunCommand(rest) {
    // One parser with the crash classifier (#448): two would disagree silently.
    const event = hookRunEvent(rest);
    const slug = resolveBrandSlugSync();
    const result = await runHookOrchestrator({
        workspaceDir: process.cwd(),
        event,
        stdin: process.stdin,
        // #384: Claude Code parses stdout for the JSON hook envelope. Nothing else
        // in this command may write to stdout, or the payload stops parsing.
        stdout: process.stdout,
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
async function agentsInstallCommand(rest) {
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
    // #416: stdin AND --file are bounded alike — an unbounded --file would make
    // the refusal's route a way around the cap.
    const json = await readBoundedStdin("reconcile", 
    // Not "fewer agents per call": reconcile merges agreement ACROSS agents,
    // so splitting them changes the verdict instead of bounding the input.
    "  Shorten each finding's message and suggestion, then re-run; --file is held to the same limit.", file ? createReadStream(file) : process.stdin);
    if (json === null)
        return 1;
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
/**
 * Changed paths for selection: working tree vs `base` (default HEAD), plus
 * untracked. Returns `undefined` when git ITSELF failed — which is not the same
 * as "nothing changed", and must not be allowed to look like it. Collapsing the
 * two is how a loop ends up running zero tests and reading it as success.
 */
async function changedPaths(cwd, base) {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    let failed = false;
    const run = async (args) => {
        try {
            const { stdout } = await promisify(execFile)("git", args, { cwd, maxBuffer: 8 * 1024 * 1024 });
            return stdout;
        }
        catch {
            failed = true;
            return "";
        }
    };
    const range = base === undefined ? ["HEAD"] : [`${base}...HEAD`];
    const [diff, untracked] = await Promise.all([
        run(["diff", "--name-only", ...range]),
        run(["ls-files", "--others", "--exclude-standard"]),
    ]);
    if (failed)
        return undefined;
    return [...new Set(`${diff}\n${untracked}`.split(/\r?\n/).filter((l) => l.trim().length > 0))];
}
async function testCommand(argv) {
    const sub = argv[0];
    const rest = argv.slice(1);
    // #360: what the TDD loop should run for the current changeset. Prints its
    // reasoning because a narrowed run must never be silent about being narrowed.
    // NOT for the pre-PR gate — that runs the full suite, by rule.
    if (sub === "select") {
        const cwd = process.cwd();
        const explicit = [];
        let json = false;
        let base;
        for (const arg of rest) {
            if (arg === "--json")
                json = true;
            else if (arg.startsWith("--files=")) {
                explicit.push(...arg.slice("--files=".length).split(",").filter(Boolean));
            }
            else if (arg.startsWith("--base=")) {
                const v = arg.slice("--base=".length);
                if (!isSafeRef(v)) {
                    console.error(`test select: refusing unsafe --base value`);
                    return 1;
                }
                base = v;
            }
            else {
                // Deny by default. A silently-ignored typo (`--bas=main`) changes which
                // changeset is considered and looks identical to a correct run.
                console.error(`test select: unrecognised argument`);
                return 1;
            }
        }
        const { reads, warnings, configDir } = loadTestMap(cwd);
        // Reported, never swallowed: a dropped rule widens the run, and the reason
        // it was dropped is the only signal that the map has rotted.
        for (const w of warnings)
            console.error(`test select: ${w}`);
        const discovered = explicit.length > 0 ? explicit : await changedPaths(cwd, base);
        if (discovered === undefined) {
            // git failed. Escalate — never present this as "nothing to run".
            const { framework } = await detectFramework(cwd);
            const full = {
                mode: "full",
                full: true,
                related: [],
                files: [],
                reason: "could not determine the changeset from git, running everything",
            };
            const cmds = selectionCommands(full, framework);
            if (json) {
                console.log(JSON.stringify({ ...full, framework, warnings, commands: cmds }));
            }
            else {
                console.log(`# ${full.reason}`);
                for (const c of cmds)
                    console.log(c);
            }
            return 0;
        }
        const selection = selectTests(discovered, reads, configDir);
        const { framework } = await detectFramework(cwd);
        const commands = selectionCommands(selection, framework);
        if (json) {
            console.log(JSON.stringify({ ...selection, framework, warnings, commands }));
            return 0;
        }
        console.log(`# ${selection.reason}`);
        if (commands.length === 0)
            console.log("# nothing to run");
        for (const c of commands)
            console.log(c);
        return 0;
    }
    if (sub === "detect-framework") {
        const workspaceArg = rest[0] ?? process.cwd();
        const result = await detectFramework(workspaceArg);
        console.log(JSON.stringify(result));
        return result.framework === "unknown" ? 1 : 0;
    }
    if (sub === "write") {
        const targetPath = rest[0];
        if (targetPath === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} test write <target-path>  (content read from stdin)`);
            return 1;
        }
        // Every refusal reason maps to a recovery route. This one needs its own:
        // the Write tool is no longer offered as a fallback (#408 AC10), so
        // without a stated route a large-but-clean test body has no way forward.
        const buffer = await readBoundedStdin("test write", `  Split the test into two files and write each with \`${resolveBrandSlugSync()} test write\`.`);
        if (buffer === null)
            return 1;
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
    console.error(`Unknown test subcommand: ${sub}
` +
        `Usage: ${resolveBrandSlugSync()} test <select|write|detect-framework>`);
    return 1;
}
async function createIssueCommand(rest) {
    const force = rest.includes("--force");
    // Read JSON payload from stdin, bounded (#408 AC11 — the same CWE-400 gap as
    // `test write`; fixing one reader and leaving its neighbours open is the
    // "reached the named surface, not the defect" pattern this epic exists to close).
    const buffer = await readBoundedStdin("create-issue", bodyRoute("issue"));
    if (buffer === null)
        return 1;
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
async function scanSecretsCommand(argv = []) {
    const buffer = await readBoundedStdin("scan-secrets", 
    // Split at LINE boundaries: every detector matches within one line, so a
    // line-aligned split cannot cut a secret in two and scan both halves clean.
    "  NOT scanned — this is not a clean result. Scan the text in parts split at line boundaries, one call each.");
    if (buffer === null) {
        // #416: the consumer skills read the JSON, and an empty stdout is not an
        // empty `hits` array — say "not scanned" on the channel they read too.
        // Deliberately no `hits` key: a reader keyed on `hits.length === 0` must
        // not be able to take a refusal for a clean scan.
        process.stdout.write(JSON.stringify({ scanned: false, error: "input not read" }) + "\n");
        return 1;
    }
    const result = scanSecretsCli(buffer, argv);
    process.stdout.write(result.output);
    return result.exitCode;
}
/**
 * #408 AC11 (CWE-400): every pipe-fed verb reads a bounded stream. Returns null
 * when the input is over the cap, having already reported it AND the verb's
 * own recovery route. The route is a required parameter (#416): #408 left it
 * to each caller, and two of three callers then refused with no way forward —
 * a dead-end (#344's class).
 */
async function readBoundedStdin(verb, route, stream = process.stdin) {
    try {
        return await readStdinBounded(stream);
    }
    catch (err) {
        if (err instanceof StdinTooLargeError) {
            console.error(`✗ ${verb}: ${err.message}`);
            console.error(route);
        }
        else {
            // #416 board (A10): a missing --file, a directory, a broken pipe. The
            // errno code only — the message carries an absolute path — and never
            // the uncaught-exception dump this used to end in.
            console.error(`✗ ${verb}: cannot read input (${readErrorCode(err)})`);
            console.error("  Check that the input exists and is a readable file or pipe, then retry.");
        }
        return null;
    }
}
/** #416: the route both GitHub-body verbs share; `--force` is the retry an agent reaches for first. */
const bodyRoute = (what) => `  Shorten the ${what} body and link longer detail instead — GitHub separately rejects a body over ` +
    `65,536 characters. --force does not lift this limit; it only overrides the secret scan.`;
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
        const buffer = await readBoundedStdin("implement create-pr", bodyRoute("PR"));
        if (buffer === null)
            return 1;
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
        // The title is slugified to 50 characters, so "shorten the title" would
        // be the wrong route: an over-cap payload is extra fields, not the title.
        const buffer = await readBoundedStdin("implement branch-name", `  Send only {"id": <number>, "title": <string>} — other fields, such as the issue body, ` +
            `count toward the limit and are not used. If the title alone is over it, shorten the title: ` +
            `the branch keeps only its first 50 slug characters.`);
        if (buffer === null)
            return 1;
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
/** Parses `--serve`, `--port <n>`/`--port=<n>` and `--since <w>`/`--since=<w>`. */
function parseServeFlags(argv) {
    let serve = false;
    let port;
    let since;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--serve")
            serve = true;
        else if (a === "--port")
            port = argv[i + 1] ?? "";
        else if (a?.startsWith("--port="))
            port = a.slice("--port=".length);
        else if (a === "--since")
            since = argv[i + 1];
        else if (a?.startsWith("--since="))
            since = a.slice("--since=".length);
    }
    return {
        serve,
        ...(port !== undefined ? { port } : {}),
        ...(since !== undefined ? { since } : {}),
    };
}
/**
 * Validates a `--port` value before any bind is attempted (AC3). Fails closed:
 * anything that is not a whole number in range is rejected, including the
 * partially-numeric strings `parseInt` would happily accept.
 */
function parsePort(raw) {
    if (raw === undefined)
        return DEFAULT_PORT;
    if (!/^\d+$/.test(raw))
        return null;
    const n = Number(raw);
    // 0 is permitted: it asks the OS for an ephemeral port, which is how the
    // tests bind without racing a fixed one.
    return n >= 0 && n <= 65535 ? n : null;
}
async function serveDashboard(argv, env, log) {
    const { port: rawPort, since } = parseServeFlags(argv);
    const port = parsePort(rawPort);
    if (port === null) {
        log(`Invalid --port "${rawPort}". Give a whole number between 0 and 65535.`);
        return 1;
    }
    let server;
    try {
        server = await startDashboardServer({
            cwd: env.cwd,
            port,
            ...(env.assetDir !== undefined ? { assetDir: env.assetDir } : {}),
            ...(env.docsDir !== undefined ? { docsDir: env.docsDir } : {}),
            ...(since !== undefined ? { since } : {}),
            log,
        });
    }
    catch (err) {
        // The server already shaped a caller-safe message (A10) — no errno, no stack.
        log(err instanceof Error ? err.message : "The dashboard server could not start.");
        return 1;
    }
    log(renderConsole({
        results: `Dashboard app running at ${server.url}`,
        meaning: "Bound to loopback and restricted to local Host headers — no data leaves this workstation, and a remote page cannot read it.",
        nextSteps: [
            `Open ${server.url}`,
            "Press Ctrl-C to stop",
        ],
    }));
    try {
        await (env.waitForShutdown ?? waitForSigint)();
    }
    finally {
        await server.close();
    }
    return 0;
}
/** Default shutdown signal: the first SIGINT after the server starts. */
function waitForSigint() {
    return new Promise((resolve) => {
        const onSignal = () => {
            process.removeListener("SIGINT", onSignal);
            resolve();
        };
        process.once("SIGINT", onSignal);
    });
}
// #180 VP-03-F08-ext: personal, local, read-only insights. No network,
// no backend, no comparison data — own workstation artefacts only.
// #301: the headline is the issue-centric delivery view read from
// docs/Handover-*.md frontmatter; telemetry gates render below it. The
// --since window applies to telemetry only — the delivery view is all-time.
export async function dashboardCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    // #346: --serve is a flag on this command rather than a new verb, so the
    // static and served surfaces cannot drift into two different dashboards.
    if (parseServeFlags(argv).serve)
        return serveDashboard(argv, env, log);
    let since;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--since")
            since = argv[i + 1];
        else if (a?.startsWith("--since="))
            since = a.slice("--since=".length);
    }
    const scan = await readHandovers(env.docsDir ?? join(env.cwd, "docs"));
    // Legacy-only docs are the expected pre-#301 state, not delivery data;
    // malformed frontmatter must surface as a warning, so it does render.
    const delivery = scan.records.length > 0 || scan.malformed > 0 ? deliveryMetrics(scan) : null;
    const cfg = await loadTelemetryConfig(env.cwd);
    const win = parseWindow(since, cfg.retentionDays);
    let gates = null;
    if (cfg.enabled) {
        const records = await readEventsInWindow(env.cwd, win.days, env.now ?? new Date());
        if (records.length > 0)
            gates = dashboardMetrics(records);
    }
    // #341 fix-list: dashboard is the parity target the other commands are
    // measured against, so it renders through the shared convention itself.
    if (delivery === null && gates === null) {
        log(renderConsole({
            results: cfg.enabled
                ? `Nothing to show — no telemetry in the ${win.label} and no handover delivery data.`
                : "Nothing to show — telemetry is disabled and there is no handover delivery data.",
            meaning: "An empty dashboard is the expected state before any delivery has been recorded — not a failure.",
            nextSteps: [
                "3c dashboard --serve",
                ...(cfg.enabled ? [] : ["3c doctor   # confirms telemetry configuration"]),
            ],
        }));
        return 0;
    }
    const html = renderDashboardHtml(delivery, gates, win.label);
    const out = join(env.cwd, `.${resolveBrandSlugSync()}`, "dashboard.html");
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, "utf8");
    const shipped = delivery?.rows.length ?? 0;
    const malformed = delivery?.malformed ?? 0;
    log(renderConsole({
        results: [
            `${shipped} ${shipped === 1 ? "issue" : "issues"} shipped on record`,
            gates !== null ? `${gates.totalRuns} gate runs in the ${win.label}` : null,
        ]
            .filter((s) => s !== null)
            .join("\n"),
        meaning: malformed > 0
            ? `${malformed} ${malformed === 1 ? "handover has" : "handovers have"} malformed frontmatter, so these numbers are incomplete.`
            : "This is a static snapshot — open it to read the delivery and gate views.",
        nextSteps: ["3c dashboard --serve   # the interactive app"],
        artifact: out,
    }));
    if (env.open)
        await env.open(out);
    return 0;
}
// #18 VP-03-F04: pre-commit security scan gate + recorded suppressions.
export async function securityCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "scan") {
        // Deny-by-default on arguments, matching `test select` (which validates the
        // identical `--base=` shape through `isSafeRef` and rejects anything it does
        // not recognise). #408's board: without this, `security scan --base main`
        // (space form) or `--bse=main` scans the auto-detected span and reports a
        // pass, looking identical to the narrowed run the operator asked for — the
        // same class of silent fail-open as the vacuous gate itself.
        let base;
        for (const a of argv.slice(1)) {
            if (!a.startsWith("--base=")) {
                log(`Unrecognised argument: ${a}\nUsage: security scan [--base=<ref>]`);
                return 1;
            }
            base = a.slice("--base=".length);
        }
        // CWE-88: git reads a leading `-` as an option, not a ref, so an unvalidated
        // value silently changes which span is scanned.
        if (base !== undefined && !isSafeRef(base)) {
            log(`Invalid --base ref: ${base}\nUsage: security scan [--base=<ref>]`);
            return 1;
        }
        const r = await runSecurityGate(env.cwd, {
            ...(env.scanner ? { scanner: env.scanner } : {}),
            // #408: NOT `env.runner ? … : undefined` on the dependency half. The gate
            // shipped for two milestones running its A03 supply-chain check only when
            // a test injected a runner; the CLI never set one, so from the product it
            // never ran at all. The default runner now applies on both halves.
            ...(env.runner ? { runner: env.runner } : {}),
            ...(base !== undefined ? { base } : {}),
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
function flagValue(argv, name) {
    for (const a of argv) {
        if (a.startsWith(`${name}=`))
            return a.slice(name.length + 1);
    }
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
}
/**
 * Was the flag SUPPLIED, whatever its value? (#399 board round 2.)
 *
 * Presence and value must be derived from the same parser or they disagree, and
 * the disagreement is silent. `flagValue` honours BOTH spellings — `--role x`
 * and `--role=x` — so a caller testing `argv.includes("--role")` sees `false`
 * for `--role=x` and skips validation on a value that is very much present.
 * That shipped for exactly one commit here: `3c onboard --role=fronted` walked
 * past the guard into a `buildRoadmap` that throws, uncaught, printing a stack
 * trace; and `--role=` was accepted as "no role given" and answered with the
 * generic roadmap. Both are the defect the guard was written to close, reached
 * through the spelling it did not parse.
 */
function flagPresent(argv, name) {
    return argv.some((a) => a === name || a.startsWith(`${name}=`));
}
/**
 * #440: a zero names its cause and a route. "Nothing was checked" alone left
 * an adopter whose layer globs matched nothing (`src/domian/**`) unable to
 * tell that apart from files that could not be read.
 */
function zeroEvaluatedMessage(unmatched, unreadable, unmapped) {
    const slug = resolveBrandSlugSync();
    const causes = [
        ...(unmatched > 0 ? [`${unmatched} file(s) matched no layer glob`] : []),
        ...(unmapped > 0 ? [`${unmapped} file(s) fall outside every \`packages:\` block`] : []),
        ...(unreadable > 0 ? [`${unreadable} file(s) in a layer could not be read`] : []),
    ];
    // The route names the FILE: `doctor` reports a valid config as just
    // "configured", which says nothing about globs that match nothing.
    return (`architecture boundary: no file was evaluated — nothing here was checked against your layer map` +
        (causes.length > 0 ? ` (${causes.join("; ")})` : "") +
        `. Check the layer globs in .${slug}/architecture.yaml, or name files with \`--files=a.ts,b.ts\`.`);
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
        // #430 AC2: a config that cannot be used is its own outcome. Exit 1 (a
        // config error), never 2 (which means cross-boundary violations) and
        // never 0 — the whole point is that the gate stops reporting a pass it
        // cannot vouch for.
        // #434: so is a tree the gate could not list — the same "could not
        // evaluate" class. Falling through would exit 2, which says the imports
        // are wrong when the gate never read them.
        if (r.configError || r.treeUnreadable) {
            log(r.message);
            return r.blocked ? 1 : 0;
        }
        if (r.notConfigured) {
            const slug = resolveBrandSlugSync();
            // The two inert states get different sentences: telling an adopter who
            // wrote an architecture.yaml that they have none sends them to `init`,
            // which answers "already exists — left unchanged".
            log(r.configState === "inert"
                ? `architecture boundary gate is present but enforces nothing — ` +
                    `.${slug}/architecture.yaml declares no \`deny\` pair the gate can act on. ` +
                    `Define the pairs you want blocked there (the file carries a worked ` +
                    `example), or run \`${slug} arch-check discover\` to draft them from the ` +
                    `import graph (advisory; not blocking).`
                : `architecture boundary gate not configured — no .${slug}/architecture.yaml. ` +
                    `Run \`${slug} arch-check init\` to scaffold a starter, or ` +
                    `\`${slug} arch-check discover\` to draft one from the import graph ` +
                    `(advisory; not blocking).`);
            return 0;
        }
        if (r.message !== "")
            log(r.message);
        else if (!r.blocked) {
            // #394, same lesson as #408 on the security gate: a silent clean pass is
            // indistinguishable from a gate that read nothing. Zero files evaluated
            // is deliberately a different sentence from a real pass — and a MISSING
            // count is a third sentence again, because `?? 0` would render a gate
            // that forgot to report as a gate that read nothing.
            log(r.filesChecked === undefined
                ? "architecture boundary: no cross-boundary violation (the gate reported no file count)."
                : r.filesChecked === 0
                    ? zeroEvaluatedMessage(r.filesUnmatched ?? 0, r.filesUnreadable ?? 0, r.filesUnmapped ?? 0)
                    : `architecture boundary: no cross-boundary violation (${r.filesChecked} file(s) checked).`);
        }
        return r.blocked ? 2 : 0;
    }
    if (sub === "discover") {
        const slug = resolveBrandSlugSync();
        try {
            const r = await runArchDiscover(env.cwd);
            // #430 AC5: a redirect caused by a BROKEN active config is not the
            // populated-and-healthy redirect, and reusing that copy told an adopter
            // to "keep your active config" about a file currently failing the gate
            // closed. This line comes first because the state of their gate matters
            // more than the tier count of a draft they have not read yet.
            if (r.reason === "malformed") {
                log(`Your active .${slug}/architecture.yaml could NOT be parsed or validated, so ` +
                    `the boundary gate is failing closed right now. Nothing was overwritten — ` +
                    `the draft went to ${r.path} instead. Fix the active file by hand, or ` +
                    `replace it with that draft once you have read it. ` +
                    `Run \`${slug} doctor\` to see the parse error.`);
                return 0;
            }
            // #401 board r1+r2: ENFORCEABILITY is judged before the destination —
            // an empty or single-tier draft must never read as a success or as an
            // adoptable proposal (the gate enforces no direction until at least two
            // tiers exist), whichever path it was written to.
            log(r.tiers === 0
                ? r.proposed
                    ? `Proposal drafted at ${r.path}, but it declares nothing — no tracked ` +
                        `non-test JS/TS source in sub-directories was found to cluster. Do ` +
                        `not adopt it; your active architecture.yaml is untouched. Delete ` +
                        `the proposal, or run discover again once source is committed.`
                    : `Drafted ${r.path}, but found no tracked non-test JS/TS source in ` +
                        `sub-directories to cluster — the gate is still inert. Define ` +
                        `layers/deny in that file (it includes a worked example), or run ` +
                        `discover again once JS/TS source under sub-directories is committed.`
                : r.tiers === 1
                    ? r.proposed
                        ? `Proposal drafted at ${r.path}, but it declares a single tier and ` +
                            `no deny pairs — adopting it would replace your active rules with ` +
                            `a gate that blocks nothing. Keep your active config; run discover ` +
                            `again once imports span more directories.`
                        : // A single layer cannot deny anything — the gate compares two
                            // DIFFERENT layers — so "add deny pairs" alone would be advice
                            // that cannot work. Name the split (board r3).
                            `Drafted ${r.path} — one tier discovered, so there is no import ` +
                                `direction to enforce yet and the gate still blocks nothing. ` +
                                `Split that layer into the layers your team actually has and add ` +
                                `the deny pairs between them (the file carries a worked ` +
                                `example), or run discover again once imports span more ` +
                                `directories.`
                    : r.proposed
                        ? `Active architecture.yaml left untouched — proposal drafted at ${r.path}. ` +
                            `Review it, then replace the active config if you adopt it.`
                        : `Drafted ${r.path} from the import graph (${r.tiers} tier(s)). ` +
                            `Review and rename the tiers, then run \`${slug} arch-check check\`.`);
            return 0;
        }
        catch (e) {
            // NFR-USE-03: remediation first, raw detail demoted below it — mirrors
            // `rules apply` on the same precondition. The git sentence is HEDGED
            // ("if this is not a git repository yet") because the wrapper prefix
            // covers every git failure mode, including a missing git binary and
            // container dubious-ownership refusals (board r1). CWE-117: strip
            // control characters so a crafted path cannot forge advisory lines.
            const msg = e.message
                .replace(/[\u0000-\u001f\u007f]+/g, " ")
                // Board r2: bounded per the clampLabel convention — an unbounded Detail
                // line would echo git stderr up to the 32MB exec buffer (CWE-400).
                .slice(0, 2000);
            log(`✗ arch-check discover failed — the workspace could not be read.`);
            if (/git ls-files failed/.test(msg)) {
                log(`  If this is not a git repository yet: ${GIT_INIT_REMEDIATION}`);
            }
            log(`  Detail: ${msg}`);
            return 1;
        }
    }
    if (sub === "init") {
        const slug = resolveBrandSlugSync();
        const r = await writeStarterArchConfig(env.cwd, slug);
        // Board r1 (ux): the reason lives ONCE, on the Next line — the scaffold
        // line restating "define layers/deny to activate" said the same thing in
        // different words one line apart.
        log(r.created
            ? `Scaffolded ${r.path} — an inert starter.`
            : `${r.path} already exists — left unchanged.`);
        // #401 AC1: name the next step while (and only while) the config is inert.
        // #384 registered the post-edit hook, so this file now has TWO consumers —
        // the commit-time gate and the every-edit hook — and the copy names both.
        // Naming only the gate would leave an adopter who has just started seeing
        // the hook fire to infer, unaided, that it reads the same file.
        // Printed unconditionally (no TTY gate): the
        // milestone's theme is the non-interactive CI/container journey.
        // #430 AC9: the predicate has one owner now, and the route differs by
        // state. Over a MALFORMED config `discover` no longer rewrites the file,
        // so advertising it as the next step would promise a repair it does not
        // perform.
        const loaded = await loadArchConfig(env.cwd);
        if (loaded.kind === "inert" && loaded.declared) {
            // Board r1: this branch used `isGateInert`, which asks the GATE's
            // question ("enforces nothing") where the answer needed is about what
            // the adopter has already written. Over a config whose layers are named
            // but whose deny list is empty — the state `discover` itself produces on
            // a single-tier repo — it printed "until layers exist", and layers DO
            // exist. It also re-advertised discover, which for this state now writes
            // a proposal instead of replacing the file: the same command, a
            // different destination, unannounced. doctor answers this state
            // correctly; init now agrees with it.
            log(`Next: add the \`deny\` pairs you want blocked to ` +
                `${archConfigPath(env.cwd)} — the layers are declared but nothing is ` +
                `denied, so the commit gate and the post-edit hook both evaluate them ` +
                `and flag nothing. Note that ` +
                `\`${slug} arch-check discover\` will now draft to ` +
                `architecture.proposed.yaml rather than replace this file.`);
        }
        else if (isGateInert(loaded)) {
            log(`Next: run \`${slug} arch-check discover\` to draft layers/deny from ` +
                `the repo's tracked import graph — until layers exist neither the ` +
                `commit gate nor the post-edit hook has anything to check.`);
        }
        else if (loaded.kind === "malformed") {
            log(`Warning: the existing .${slug}/architecture.yaml does not parse or ` +
                `validate (${loaded.detail}), so the boundary gate fails closed. ` +
                `Open that file and fix it — \`${slug} arch-check discover\` will not ` +
                `rewrite it.`);
        }
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
            // Board r3 (CWE-117): the key is adopter-supplied and reached this line
            // raw, so a newline in it printed a standalone forged advisory line
            // that reads as gate output. Every other adopter string on this
            // surface is clamped; this was the one that was not.
            log(`Exception recorded for ${clampLabel(key)} — expires ${clampLabel(expires)}`);
            return 0;
        }
        catch (e) {
            log(`Could not record exception: ${e.message}`);
            return 1;
        }
    }
    log("Usage: arch-check <check|except|init|discover>");
    return 1;
}
/**
 * #378 AC3 — the only text an unusable `--user` produces. It never repeats the
 * value (A10 / CWE-117): the refused input is exactly what must not reach a
 * terminal or a log, and the developer knows what they typed.
 */
function unsafeUserMessage() {
    const slug = resolveBrandSlugSync();
    return ("✗ --user must be a plain name: 1-64 letters, digits, '.', '_' or '-', starting with a " +
        "letter, digit or '_' — no path separators, and not ending in '.'.\n" +
        `  Try: ${slug} onboard --user <safe-name>`);
}
function onboardWriteFailedMessage(code) {
    const slug = resolveBrandSlugSync();
    return (`✗ Could not read or write the onboarding state under .${slug}/onboarding/ (${code}).\n` +
        `  Check it is a writable directory and that no other program holds the file open, then re-run \`${slug} onboard\`.`);
}
function linkedPathMessage() {
    const slug = resolveBrandSlugSync();
    return (`✗ The onboarding state under .${slug}/ is reached through a symbolic link or junction, ` +
        "so it was neither read nor written.\n" +
        `  Remove the link (or move the real directory into place), then re-run \`${slug} onboard\`.`);
}
// #15 VP-02-F09: guided onboarding skill (primitive; #22 layers over it).
export async function onboardCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    // #378: an EXPLICIT name is validated and refused, never normalised — mapping
    // two typed names onto one file would be silent. The OS DEFAULT is normalised
    // and never refused: the developer did not type it, and refusing it would make
    // a bare `onboard` unreachable for `DOMAIN\jsmith`. `flagPresent`, so a bare
    // `--user` or `--user=` is an explicit request that is refused rather than
    // silently answered with the OS name.
    let user;
    if (flagPresent(argv, "--user")) {
        const given = flagValue(argv, "--user");
        if (given === undefined || !isSafeUser(given)) {
            log(unsafeUserMessage());
            return 1;
        }
        user = given;
    }
    else {
        user = normaliseDefaultUser((env.osUser ?? (() => userInfo().username))());
    }
    const level = flagValue(argv, "--level");
    const role = flagValue(argv, "--role");
    const ask = flagValue(argv, "--ask");
    const action = ask
        ? "ask"
        : argv.includes("--advance")
            ? "advance"
            : argv.includes("--starter")
                ? "starter"
                : undefined;
    // #343 AC7: a bare or empty `--ask` is a request with no question. It used
    // to fall through as a plain run — the developer asked and was answered with
    // the roadmap, in silence. Refused here, like an unusable `--role`.
    if (flagPresent(argv, "--ask") && (ask === undefined || ask.trim() === "")) {
        log(`✗ --ask needs a question: ${resolveBrandSlugSync()} onboard --ask "<question>"`);
        return 1;
    }
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
    // Validated at the trust boundary, before anything is written under the
    // developer's name (#399 AC1). Pre-fold an unrecognised role fell through to
    // a GENERIC roadmap, so `--role fronted` silently seeded a different set of
    // modules and the developer had no way to tell.
    // `flagPresent`, not `argv.includes`: presence and value come from the same
    // parser, so `--role=x` cannot be invisible to one and visible to the other.
    // Presence is what triggers the check rather than `role !== undefined`,
    // because `flagValue` returns undefined both when the flag is absent and when
    // it trails the argv (`3c onboard --role`) — and the second is a developer who
    // asked for a role and would otherwise be handed the generic roadmap in
    // silence. `""` is rejected here too, so this and `buildRoadmap`'s own guard
    // cannot classify the same input differently.
    if (flagPresent(argv, "--role") && (role === undefined || role === "" || !isKnownRole(role))) {
        log(`Unknown role \`${role ?? ""}\` — expected one of: ${KNOWN_ROLES.join(", ")}`);
        return 1;
    }
    let r;
    try {
        r = await runOnboard(env.cwd, {
            user,
            ...(level ? { level } : {}),
            ...(role ? { role } : {}),
            ...(action ? { action } : {}),
            ...(ask ? { query: ask } : {}),
            ...(action === "starter" ? { spawn: env.spawn ?? realSpawn } : {}),
            explicitUser: flagPresent(argv, "--user"),
        });
    }
    catch (err) {
        // Fails CLOSED with a generic line, never a stack trace (A10). A refusal from
        // the path layer says why; any other failure — `rename` EPERM/EBUSY on
        // Windows when the record is open elsewhere, `mkdir` EEXIST/ENOTDIR when
        // `.3c` or `onboarding` is a regular file — names only its errno code, which
        // carries no path. The product-wide handler for every other command is #448.
        if (err instanceof OnboardPathError) {
            log(err.kind === "linked-path" ? linkedPathMessage() : unsafeUserMessage());
            return 1;
        }
        // Only a FILESYSTEM error is translated — one carrying an errno code. A
        // programming error relabelled "could not write onboarding state" would
        // send the developer to check a directory that is fine.
        const code = err.code;
        if (typeof code === "string" && /^E[A-Z]+$/.test(code)) {
            log(onboardWriteFailedMessage(code));
            return 1;
        }
        throw err;
    }
    const shownRole = r.progress.role;
    log(`Onboarding — ${user}${shownRole ? ` (${shownRole})` : ""}`);
    // Never a silent reset: a dropped id is reported before the roadmap, so the
    // developer sees why their position moved.
    if (r.invalidated)
        log(r.invalidated);
    for (const m of r.roadmap) {
        const mark = r.progress.completed.includes(m.id)
            ? "[x]"
            : r.progress.current === m.id
                ? "[>]"
                : "[ ]";
        log(`  ${mark} ${m.id} — ${m.title}`);
    }
    if (r.progress.current) {
        log(`Current: ${r.progress.current}`);
        // #399 AC4. The bodies are the project-derived content — CLAUDE.md for
        // `architecture`, package scripts for `workflows` — and they were computed
        // and thrown away, which left the output indistinguishable from a static
        // checklist. Only the CURRENT module's, and excerpted: `architecture`'s
        // body IS the whole of CLAUDE.md.
        const body = r.roadmap.find((m) => m.id === r.progress.current)?.body;
        if (body)
            log(`\n${excerptBody(body)}`);
    }
    else if (r.completedAll) {
        log("All modules complete — completion recorded locally.");
    }
    else {
        log("All modules complete.");
    }
    if (r.answer)
        log(`\n${r.answer}`);
    if (r.starter)
        log(`\nStarter task: #${r.starter.number} — ${forConsole(r.starter.title)}`);
    // #343 AC7: a starter request that found nothing used to print nothing. The
    // two misses get different advice — another --level cannot fix a missing gh.
    // The level is the developer's own argument, echoed through forConsole
    // (CWE-117/150: an ESC sequence in it could rewrite the terminal line).
    else if (r.starterOutcome?.kind === "none") {
        log(`\nNo open starter issue labelled \`${forConsole(level ?? "good-first")}\` — try another --level, or ask your lead.`);
    }
    else if (r.starterOutcome?.kind === "unavailable") {
        log("\nCouldn't list starter issues — the GitHub CLI (gh) is unavailable or not signed in. Ask your lead for a first task.");
    }
    // #343 AC1: every state ends with where the developer is and what to run next.
    log("");
    const starter = r.starterOutcome === undefined
        ? undefined
        : r.starterOutcome.kind === "found"
            ? { kind: "found", number: r.starterOutcome.task.number }
            : { kind: r.starterOutcome.kind };
    for (const line of onboardNextLines(r.roadmap.map((m) => m.id), r.progress, {
        slug: resolveBrandSlugSync(),
        explicitUser: flagPresent(argv, "--user") ? user : null,
        ...(starter ? { starter } : {}),
    })) {
        log(line);
    }
    return 0;
}
// #280 — one-shot installer. A thin sequencer over the existing command wrappers
// (no new provisioning logic); each underlying command stays independently runnable.
async function setupFileExists(p) {
    try {
        await stat(p);
        return true;
    }
    catch {
        return false;
    }
}
async function setupDirHasMd(dir) {
    try {
        return (await readdir(dir)).some((e) => e.endsWith(".md"));
    }
    catch {
        return false;
    }
}
// #452: the backup every step of one `setup --replace` run shares; unset
// outside setup, where each command takes its own.
let sharedBackup;
/** The backup for this replace: setup's shared one, or a fresh one for a standalone command. */
function currentBackup() {
    return sharedBackup ?? createBackup(process.cwd(), resolveBrandSlugSync());
}
/** Say where a standalone replace put its backup; setup reports once, at the end. */
function reportBackup(backup) {
    if (backup && backup !== sharedBackup && backup.saved > 0) {
        console.log(`↩ backed up ${backup.saved} file(s) to ${backup.dir} before replacing them — copy them back to undo.`);
    }
}
export async function setupCommand(argv) {
    const yes = argv.includes("--yes") || argv.includes("-y");
    const replaceArgs = argv.includes("--replace") ? ["--replace"] : [];
    const cwd = process.cwd();
    const log = console.log.bind(console);
    // #452: every step of one replace run shares one backup directory.
    const mine = replaceArgs.length > 0 ? createBackup(cwd, resolveBrandSlugSync()) : undefined;
    if (mine)
        sharedBackup = mine;
    const steps = [
        {
            name: "CLAUDE.md (init)",
            run: async () => {
                // Idempotent: init aborts on an existing CLAUDE.md, so skip-with-notice.
                //
                // #406: `--replace` deliberately does NOT reach here. CLAUDE.md is the
                // adopter's own standards document — the file they are most likely to
                // have edited, and the one with no upstream content worth restoring.
                // Refreshing skills and agents is an upgrade; overwriting CLAUDE.md is
                // data loss. The boundary is asserted in setup-integration.test.ts.
                if ((await setupFileExists(join(cwd, "CLAUDE.md"))) ||
                    (await setupFileExists(join(cwd, ".claude", "CLAUDE.md")))) {
                    log("↪ CLAUDE.md already present — skipping init.");
                    return 0;
                }
                return initCommand(parseInitArgs(yes ? ["--yes"] : []));
            },
        },
        {
            name: "rules (security/owasp-top-10 + security/cwe-top-25-2025)",
            run: async () => {
                // #294: both packs — the crew's security-reviewer references both
                // paths, so the baseline must exist on a default install.
                //
                // #406: rules are copy-installed and go stale exactly like skills, and
                // the documented upgrade route names them. Without threading
                // `--replace` here, `setup --replace` refreshed two of the three
                // artefact classes its own instruction claims to cover.
                for (const pack of ["security/owasp-top-10", "security/cwe-top-25-2025"]) {
                    const installed = await rulesInstallCommand([pack, ...replaceArgs]);
                    if (installed !== 0)
                        return installed;
                }
                return rulesApplyCommand();
            },
        },
        { name: "hook", run: () => hookInstallCommand() },
        { name: "skills", run: () => skillsInstallCommand(replaceArgs) },
        {
            name: "agents",
            run: async () => {
                // installAgents aborts-with-error on existing files (unlike skills,
                // which skip), so pre-check for idempotent re-runs.
                if (replaceArgs.length === 0 &&
                    (await setupDirHasMd(join(cwd, ".claude", "agents")))) {
                    log("↪ agents already installed — skipping (use --replace to overwrite).");
                    return 0;
                }
                return agentsInstallCommand(replaceArgs);
            },
        },
        { name: "arch-check (inert gate)", run: () => archCommand(["init"], { cwd }) },
        {
            // Final verify. Advisory — its findings are printed, but a non-blocking
            // doctor result never fails the provisioning.
            name: "doctor (verify)",
            run: async () => {
                await doctorCommand();
                return 0;
            },
        },
    ];
    try {
        const outcome = await runSetup(steps, log);
        return outcome.failedAt ? 1 : 0;
    }
    finally {
        // Clear only this run's backup — never one a concurrent run installed.
        if (mine && sharedBackup === mine)
            sharedBackup = undefined;
        if (mine && mine.saved > 0) {
            log(`\n↩ setup backed up ${mine.saved} file(s) to ${mine.dir} before replacing them — copy them back to undo.`);
        }
    }
}
export async function main(argv) {
    const command = argv[0];
    if (command === "--version" || command === "-v") {
        console.log(VERSION);
        return 0;
    }
    if (command === "setup" || (command === "init" && argv.includes("--all"))) {
        return setupCommand(argv.slice(1));
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
        return scanSecretsCommand(argv.slice(1));
    }
    if (command === "implement") {
        return implementCommand(argv.slice(1));
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
    if (command === "reconcile") {
        return reconcileCommand(argv.slice(1));
    }
    if (command === "deps") {
        return depsCommand(argv.slice(1));
    }
    if (command === "arch-check") {
        return archCommand(argv.slice(1), { cwd: process.cwd() });
    }
    if (command === "onboard") {
        return onboardCommand(argv.slice(1), { cwd: process.cwd() });
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
    const brand = resolveBrand(framework);
    if (command === undefined || command === "--help" || command === "-h") {
        console.log(substitute(HELP_TEMPLATE, brand));
        return 0;
    }
    console.error(`Unknown command: ${command}`);
    // #394: a RETIRED verb is not an unknown one, and the difference matters to
    // the person typing it. `doctor` already names a retirement it finds in
    // installed skill text (#406), but that path cannot see a human at a shell
    // reaching for a command they used last week — they get the generic message
    // and a 90-line help dump, with nothing connecting the word they typed to
    // the capability that replaced it. Driven by the same deny-list, so a verb
    // is registered once and both surfaces answer for it.
    // Own keys only: this is indexed with whatever word the user typed, and a
    // plain lookup walks the prototype chain — `3c constructor` reported a
    // retirement whose replacement sentence was native code.
    const replacement = Object.hasOwn(RETIREMENT_REPLACEMENTS, command)
        ? RETIREMENT_REPLACEMENTS[command]
        : undefined;
    if (replacement !== undefined) {
        // Substituted, exactly like HELP_TEMPLATE below. A branded deployment
        // whose adopter types the retired verb must be told to run THEIR
        // binary; naming the upstream one sends them to install over their
        // own vetted deployment.
        console.error(`\`${command}\` was retired. ${substitute(replacement, brand)}`);
    }
    console.log(substitute(HELP_TEMPLATE, brand));
    return 1;
}
/**
 * True when this module is the process entry point rather than an import.
 *
 * npm installs the `3c` bin as a symlink (`node_modules/.bin/3c` ->
 * `../@kgn-git/3c/dist/cli.js`). Node reports the SYMLINK path in
 * `process.argv[1]` while `import.meta.url` resolves to the real file, so
 * comparing the two directly is always false under a normal install and
 * `main()` never runs — every command exited 0 in silence on Linux and macOS.
 * Windows was unaffected because npm writes .cmd/.ps1 shims that pass the real
 * path. Resolving argv[1] through realpath makes both invocation styles match.
 */
export function isDirectInvocation(moduleUrl, invokedPath) {
    if (invokedPath === undefined)
        return false;
    let resolved = invokedPath;
    try {
        resolved = realpathSync(invokedPath);
    }
    catch {
        // argv[1] may not exist on disk (odd loaders, virtual entry points); fall
        // back to the raw path rather than throwing during startup.
    }
    return moduleUrl === pathToFileURL(resolved).href;
}
// Run only when executed directly (e.g. the `3c` bin / `node dist/cli.js`),
// not when imported (tests import `main`/`dashboardCommand`).
if (isDirectInvocation(import.meta.url, process.argv[1])) {
    const argv = process.argv.slice(2);
    // #448 (A10): nothing reaches Node's default printer — a raw stack with the
    // adopter's absolute paths. The try covers a throw out of `main`; the
    // handlers cover a throw or rejection nothing awaited.
    installFatalHandlers(argv);
    let exitCode;
    try {
        exitCode = await main(argv);
    }
    catch (err) {
        exitCode = reportFatal(err, argv);
    }
    process.exit(exitCode);
}
//# sourceMappingURL=cli.js.map