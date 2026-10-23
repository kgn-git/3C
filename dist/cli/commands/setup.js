import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { createBackup } from "../../install/backup.js";
import { installIssueTemplate, ISSUE_TEMPLATE_PATH } from "../../install/issue-template.js";
import { PACKAGE_ROOT } from "../shared.js";
import { SETUP_RULE_PACKS } from "../../rules/setup-packs.js";
import { setSharedBackup, sharedBackup } from "../backup-scope.js";
import { runSetup } from "../setup.js";
import { archCommand } from "./arch.js";
import { doctorCommand } from "./doctor.js";
import { hookInstallCommand } from "./hook.js";
import { initCommand, parseInitArgs } from "./init.js";
import { agentsInstallCommand, skillsInstallCommand } from "./install.js";
import { rulesApplyCommand, rulesInstallCommand } from "./rules.js";
// One-shot installer. A thin sequencer over the existing command wrappers
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
export async function setupCommand(argv) {
    const yes = argv.includes("--yes") || argv.includes("-y");
    const replaceArgs = argv.includes("--replace") ? ["--replace"] : [];
    const cwd = process.cwd();
    const log = console.log.bind(console);
    // Every step of one replace run shares one backup directory.
    const mine = replaceArgs.length > 0 ? createBackup(cwd, resolveBrandSlugSync()) : undefined;
    if (mine)
        setSharedBackup(mine);
    const steps = [
        {
            name: "CLAUDE.md (init)",
            run: async () => {
                // Idempotent: init aborts on an existing CLAUDE.md, so skip-with-notice.
                //
                // `--replace` deliberately does NOT reach here. CLAUDE.md is the
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
            name: `rules (${SETUP_RULE_PACKS.join(" + ")})`,
            run: async () => {
                // The crew's reviewers cite these packs by path (security and
                // quality), so they must exist on a default install.
                //
                // Rules are copy-installed and go stale exactly like skills, and the
                // documented upgrade route names them. Without threading `--replace`
                // here, `setup --replace` would refresh only two of the three artefact
                // classes its own instruction claims to cover.
                for (const pack of SETUP_RULE_PACKS) {
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
        {
            // The form the pipeline's ship step files each delivery record in.
            name: "issue template (handover)",
            run: async () => {
                const r = await installIssueTemplate({
                    workspace: cwd,
                    packageRoot: PACKAGE_ROOT,
                    replace: replaceArgs.length > 0,
                    ...(mine ? { backup: mine } : {}),
                });
                log(r === "kept"
                    ? `↪ ${ISSUE_TEMPLATE_PATH} differs from the package — kept (use --replace to refresh it).`
                    : `✓ ${ISSUE_TEMPLATE_PATH} ${r}`);
                return 0;
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
            setSharedBackup(undefined);
        if (mine && mine.saved > 0) {
            log(`\n↩ setup backed up ${mine.saved} file(s) to ${mine.dir} before replacing them — copy them back to undo.`);
        }
    }
}
//# sourceMappingURL=setup.js.map