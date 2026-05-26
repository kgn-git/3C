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
    // #242: the copy path registers BOTH PreToolUse hooks — the Bash pre-commit
    // orchestrator AND the Read|Edit|Write subagent path-guard. The path-guard
    // previously shipped only via the plugin manifest (`${CLAUDE_PLUGIN_ROOT}`);
    // with the plugin/colon distribution path retired (#247) this is its sole
    // registration. Both commands resolve via the brand slug on PATH — there is
    // no `${CLAUDE_PLUGIN_ROOT}` dependency on the copy path.
    const pathGuardCommand = `${slug} hook path-guard`;
    // Ensure a PreToolUse (matcher -> command) entry exists, preserving any
    // unrelated entries. Returns true iff it added the command (was not present).
    const ensure = (matcher, command) => {
        const entry = preToolUse.find((e) => e.matcher === matcher);
        if (!entry) {
            preToolUse.push({
                matcher,
                hooks: [{ type: "command", command, timeout: HOOK_TIMEOUT_MS }],
            });
            return true;
        }
        entry.hooks ??= [];
        if (entry.hooks.some((h) => h.type === "command" && h.command === command)) {
            return false;
        }
        entry.hooks.push({ type: "command", command, timeout: HOOK_TIMEOUT_MS });
        return true;
    };
    // Order matters: register the Bash orchestrator first so it stays PreToolUse[0].
    const added = [
        ensure("Bash", hookCommand),
        ensure("Read|Edit|Write", pathGuardCommand),
    ].some(Boolean);
    if (!added && existed) {
        return { ok: true, action: "already-installed", path: settingsPath };
    }
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
    return { ok: true, action: "installed", path: settingsPath };
}
//# sourceMappingURL=install.js.map