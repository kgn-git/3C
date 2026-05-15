// Registers the orchestrator with Claude Code by adding (or updating)
// the PreToolUse / Bash hook entry in `.claude/settings.json`. One-time
// per developer per workspace (per AC4 — distinguish hook registration
// from hook configuration).
// AD-16: the registered hook command is `${BRAND_SLUG} hook run --event=PreToolUse`,
// resolved at install time via resolveBrandSlugSync().
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
const HOOK_TIMEOUT_MS = 12000;
export async function installHook(workspaceDir) {
    const slug = resolveBrandSlugSync();
    const hookCommand = `${slug} hook run --event=PreToolUse`;
    const claudeDir = join(workspaceDir, ".claude");
    const settingsPath = join(claudeDir, "settings.json");
    await mkdir(claudeDir, { recursive: true });
    let settings = {};
    let existed = false;
    try {
        const raw = await readFile(settingsPath, "utf8");
        existed = true;
        try {
            settings = JSON.parse(raw);
        }
        catch (err) {
            return {
                ok: false,
                error: `${settingsPath} is not valid JSON: ${err.message}`,
            };
        }
    }
    catch (err) {
        if (err.code !== "ENOENT")
            throw err;
    }
    if (typeof settings !== "object" || settings === null || Array.isArray(settings)) {
        return {
            ok: false,
            error: `${settingsPath} top-level value must be a JSON object`,
        };
    }
    const hooks = (settings.hooks ??= {});
    const preToolUse = (hooks.PreToolUse ??= []);
    // Find any existing matcher entry whose hook list contains our command.
    let alreadyPresent = false;
    for (const entry of preToolUse) {
        if (entry.matcher === "Bash") {
            const has = entry.hooks?.some((h) => h.type === "command" && h.command === hookCommand);
            if (has) {
                alreadyPresent = true;
                break;
            }
            // Bash matcher exists but our command isn't in it — append it.
            entry.hooks ??= [];
            entry.hooks.push({
                type: "command",
                command: hookCommand,
                timeout: HOOK_TIMEOUT_MS,
            });
            alreadyPresent = false;
            break;
        }
    }
    if (!alreadyPresent && !preToolUse.some((e) => e.matcher === "Bash")) {
        preToolUse.push({
            matcher: "Bash",
            hooks: [
                { type: "command", command: hookCommand, timeout: HOOK_TIMEOUT_MS },
            ],
        });
    }
    if (alreadyPresent && existed) {
        return { ok: true, action: "already-installed", path: settingsPath };
    }
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
    return { ok: true, action: "installed", path: settingsPath };
}
//# sourceMappingURL=install.js.map