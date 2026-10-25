// Registers this framework's hooks with Claude Code in `.claude/settings.json`.
// Three commands across two events: the PreToolUse Bash orchestrator, the
// PreToolUse path-guard on every tool, and the PostToolUse
// Edit|Write|MultiEdit post-edit check. Safe to re-run — it adds what is
// missing, moves an older path-guard registration onto every tool, repairs
// the timeout unit on its own entries, and leaves other tools' entries alone
// (hook registration is distinct from hook configuration).
// AD-16: every registered command is `${FRAMEWORK_SLUG} …`, resolved at install
// time via resolveBrandSlugSync().
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
// Claude Code reads `timeout` in SECONDS (documented default 600), not
// milliseconds. A hook runs on every edit, and the registered timeout is the
// sole bound on a hang on the interactive path (NFR-PERF-01) — the
// orchestrator's PostToolUse branch has no internal AbortController.
const HOOK_TIMEOUT_SECONDS = 12;
/**
 * The path guard judges every tool a subagent calls, so it is registered on
 * all of them: a narrower matcher would leave a tool it never sees.
 */
export const PATH_GUARD_MATCHER = "*";
// The file-writing tools the hook watches. A writing tool missing here makes
// the hook silent for whichever edits arrive through it.
const POST_EDIT_MATCHER = "Edit|Write|MultiEdit";
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
    // `settings.json` is adopter-controlled and shared with other tools.
    // `hooks: []` survives `??=` and takes property assignment, but
    // JSON.stringify serialises the Array as `[]` — every registration silently
    // discarded while the CLI prints "✓ Hook registered". `hooks.PreToolUse: {}`
    // makes `.find` a TypeError that escapes to the top-level await with a stack
    // trace of absolute internal paths (A10). Fail closed with the same shape
    // malformed JSON already gets.
    const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
    if (settings.hooks !== undefined && !isPlainObject(settings.hooks)) {
        return { ok: false, error: `${settingsPath}: "hooks" must be a JSON object` };
    }
    const hooks = (settings.hooks ??= {});
    for (const event of ["PreToolUse", "PostToolUse"]) {
        const v = hooks[event];
        if (v !== undefined && !Array.isArray(v)) {
            return { ok: false, error: `${settingsPath}: "hooks.${event}" must be a JSON array` };
        }
    }
    const preToolUse = (hooks.PreToolUse ??= []);
    const postToolUse = (hooks.PostToolUse ??= []);
    // Both PreToolUse hooks — the Bash pre-commit orchestrator and the
    // all-tools subagent path-guard — are registered only here, and both
    // resolve via the brand slug on PATH, so no install-root variable is needed.
    const pathGuardCommand = `${slug} hook path-guard`;
    // Registers the event `orchestrator.ts` already gates post-edit
    // validation on. Without this entry the capability exists and never runs.
    const postEditCommand = `${slug} hook run --event=PostToolUse`;
    // Ensure a (matcher -> command) entry exists on the given event, preserving
    // any unrelated entries. Returns true iff it added the command.
    const ensure = (list, matcher, command) => {
        // Another tool's malformed entry is not ours to crash on, nor to reuse.
        const entry = list.find((e) => isPlainObject(e) && e.matcher === matcher && (e.hooks === undefined || Array.isArray(e.hooks)));
        if (!entry) {
            list.push({
                matcher,
                hooks: [{ type: "command", command, timeout: HOOK_TIMEOUT_SECONDS }],
            });
            return true;
        }
        entry.hooks ??= [];
        if (entry.hooks.some((h) => isPlainObject(h) && h.type === "command" && h.command === command)) {
            return false;
        }
        entry.hooks.push({ type: "command", command, timeout: HOOK_TIMEOUT_SECONDS });
        return true;
    };
    // A path guard on a narrower matcher leaves every other tool unguarded, so
    // it moves onto every tool. Only our command moves; anything else on that
    // entry stays where it is.
    let moved = false;
    for (let i = preToolUse.length - 1; i >= 0; i--) {
        const entry = preToolUse[i];
        if (!isPlainObject(entry) || entry.matcher === PATH_GUARD_MATCHER || !Array.isArray(entry.hooks))
            continue;
        const kept = entry.hooks.filter((h) => !(isPlainObject(h) && h.type === "command" && h.command === pathGuardCommand));
        if (kept.length === entry.hooks.length)
            continue;
        moved = true;
        if (kept.length === 0)
            preToolUse.splice(i, 1);
        else
            entry.hooks = kept;
    }
    // Order matters: register the Bash orchestrator first so it stays PreToolUse[0].
    const added = [
        ensure(preToolUse, "Bash", hookCommand),
        ensure(preToolUse, PATH_GUARD_MATCHER, pathGuardCommand),
        ensure(postToolUse, POST_EDIT_MATCHER, postEditCommand),
    ].some(Boolean) || moved;
    // Repair a wrong or missing timeout (e.g. one written in milliseconds).
    // Scoped to OUR OWN commands by exact string — another tool's entry in the
    // adopter's settings.json is not ours to rewrite, whatever unit it uses.
    const ours = new Set([hookCommand, pathGuardCommand, postEditCommand]);
    let repaired = false;
    for (const entry of [...preToolUse, ...postToolUse]) {
        // Another tool's malformed entry is not ours to crash on.
        if (!isPlainObject(entry) || !Array.isArray(entry.hooks))
            continue;
        for (const h of entry.hooks) {
            if (isPlainObject(h) &&
                h.type === "command" &&
                typeof h.command === "string" &&
                ours.has(h.command) &&
                // Not a `!== undefined` guard: OUR OWN entry with no `timeout` at all
                // must be repaired too, or it inherits the runtime's 600s default on a
                // hook that runs on every edit — the least-bounded state.
                h.timeout !== HOOK_TIMEOUT_SECONDS) {
                h.timeout = HOOK_TIMEOUT_SECONDS;
                repaired = true;
            }
        }
    }
    if (!added && !repaired && existed) {
        return { ok: true, action: "already-installed", path: settingsPath };
    }
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
    return { ok: true, action: "installed", path: settingsPath };
}
//# sourceMappingURL=install.js.map