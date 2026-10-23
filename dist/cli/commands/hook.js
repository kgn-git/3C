import { readFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { join } from "node:path";
import { confirm } from "@inquirer/prompts";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { recordBypass } from "../../hooks/bypass.js";
import { checkAndConfirmHooksConfig } from "../../hooks/diff-confirm.js";
import { installHook } from "../../hooks/install.js";
import { runHookOrchestrator } from "../../hooks/orchestrator.js";
import { hookRunEvent } from "../fatal.js";
export async function hookRunCommand(rest) {
    // One parser with the crash classifier: two would disagree silently.
    const event = hookRunEvent(rest);
    const slug = resolveBrandSlugSync();
    const result = await runHookOrchestrator({
        workspaceDir: process.cwd(),
        event,
        stdin: process.stdin,
        // Claude Code parses stdout for the JSON hook envelope. Nothing else
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
export async function hookConfirmCommand() {
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
export async function hookInstallCommand() {
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
export async function bypassCommand(rest) {
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
//# sourceMappingURL=hook.js.map