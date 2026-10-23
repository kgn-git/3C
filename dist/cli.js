#!/usr/bin/env node
// FIRST, so the fatal handlers are live before any other module loads.
import "./cli/fatal-boot.js";
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadFramework, resolveBrand } from "./branding/load.js";
import { substitute } from "./branding/substitute.js";
import { archCommand } from "./cli/commands/arch.js";
import { bugCommand } from "./cli/commands/bug.js";
import { dashboardCommand } from "./cli/commands/dashboard.js";
import { doctorCommand } from "./cli/commands/doctor.js";
import { bypassCommand, hookConfirmCommand, hookInstallCommand, hookRunCommand } from "./cli/commands/hook.js";
import { createIssueCommand, implementCommand, scanSecretsCommand } from "./cli/commands/implement.js";
import { initCommand, parseInitArgs } from "./cli/commands/init.js";
import { agentsInstallCommand, agentsListCommand, skillsInstallCommand, skillsListCommand } from "./cli/commands/install.js";
import { onboardCommand } from "./cli/commands/onboard.js";
import { depsCommand, reconcileCommand } from "./cli/commands/orchestration.js";
import { rulesApplyCommand, rulesInstallCommand } from "./cli/commands/rules.js";
import { debugCommand, securityCommand } from "./cli/commands/security.js";
import { setupCommand } from "./cli/commands/setup.js";
import { testCommand } from "./cli/commands/test.js";
import { installFatalHandlers, reportFatal } from "./cli/fatal.js";
import { HELP_TEMPLATE } from "./cli/help.js";
import { hookPathGuardCli } from "./cli/hook-path-guard.js";
import { PACKAGE_ROOT } from "./cli/shared.js";
import { VERSION } from "./index.js";
export { HELP_TEMPLATE } from "./cli/help.js";
export { dashboardCommand } from "./cli/commands/dashboard.js";
export { securityCommand, debugCommand } from "./cli/commands/security.js";
export { bugCommand } from "./cli/commands/bug.js";
export { archCommand } from "./cli/commands/arch.js";
export { onboardCommand } from "./cli/commands/onboard.js";
export { setupCommand } from "./cli/commands/setup.js";
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
    // Honest about what exists: no rationale file ever shipped for it to
    // resolve, and the packs cite unevenly — most bundled rules carry no source URL:
    // the CWE pack cites CWE ids, most pattern files and the quality pack cite
    // nothing, and the rest cite a book or author. So this must not
    // promise a "Source line" — it points at the rule file itself.
    explain: "No rationale files ever shipped for it to resolve. The reasoning that exists lives in each rule file itself — open .claude/rules/<pack>/<rule>.md.",
    // The LOCAL route, matching strategy/marketing/uninstall-upgrade.md —
    // not `npm install -g`. `doctor`'s existing upgrade line is a different
    // flavour and fires only on version skew; this is what the person who typed
    // the verb needs, and `upgrade` is the most guessable name for the operation
    // people actually perform, so a bare "Unknown command" here is the dead-end
    // the retirement would otherwise create.
    //
    // `--replace` is load-bearing. Whoever types `3c upgrade` is by definition an
    // EXISTING adopter, and a plain `setup` "Re-runs ADD what is missing and skip
    // what exists" (HELP_TEMPLATE below) — so it would exit 0 having refreshed
    // nothing, while installed skills still invoke retired verbs: the stale-skill
    // defect reproduced inside the recovery message for it.
    upgrade: "It verified a git tag inside a package directory npm installs with no .git, so it refused for every adopter. Re-install the release, then refresh the copied artefacts: `npm install git+https://github.com/kgn-git/3C.git#<release-sha>` (the commit sha from the release notes) then `${FRAMEWORK_SLUG} setup --replace` (a plain `setup` only adds what is missing). `${FRAMEWORK_SLUG} doctor` afterwards reports any skill still invoking a retired command.",
    // Retired as a GROUP: `history` and `as-of` both went. `as-of` fetched
    // every file's content over N git subprocesses to print filenames, and
    // neither is named anywhere in templates/. Deliberately NOT relocated to a
    // `rules history` verb — a fold would move a dead-end rather than close one.
    standards: "The rules themselves are the record, and git already holds their history: `git log -- .claude/rules/`. Run `rules apply` to re-resolve the `load: inject` ones into CLAUDE.md; the rest Claude Code loads from .claude/rules/ itself.",
    // `--env staging` and `--env prod` shelled out to byte-identical
    // strings, so the flag implied a selection it never made.
    deploy: "It sequenced shell commands you supplied, with no per-environment command of its own. Run them from your own pipeline; `arch-check check` and `security scan` are the gates worth keeping in front of a release.",
    // Nothing invoked it and nothing fed it: no toolchain here or in a
    // fresh `setup` writes coverage-final.json, so on the empty fallback map
    // every changed line read as uncovered.
    "coverage-gate": "Nothing ever fed it — no `setup` produces a coverage report for it to read, so it measured an empty map. Use your test runner's own coverage threshold; the capability is re-filed as #432.",
    // A FOLD, not a deletion — the capability survives as a flag, so this
    // sentence has to hand the reader the replacement rather than explain a loss.
    // The two verbs shared one state file and wrote conflicting meanings into its
    // `level` field, so running either after the other re-seeded the other's
    // record. Role modules keep their ids across the fold, which is what lets an
    // in-flight record migrate instead of being invalidated.
    "onboard-guide": "It has been folded into `${FRAMEWORK_SLUG} onboard --role <frontend|backend|devops>`, which reads the project the way the guide never did — role modules are appended to the CLAUDE.md/scripts roadmap rather than replacing it. Progress carries over: your role is read from the record you already have.",
};
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
    // A RETIRED verb is not an unknown one, and the difference matters to
    // the person typing it. `doctor` already names a retirement it finds in
    // installed skill text, but that path cannot see a human at a shell
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
    // A10: nothing reaches Node's default printer — a raw stack with the
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