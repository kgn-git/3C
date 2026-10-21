// Registers this framework's hooks with Claude Code in `.claude/settings.json`.
// Three commands across two events (#384): the PreToolUse Bash orchestrator,
// the PreToolUse Read|Edit|Write path-guard, and the PostToolUse
// Edit|Write|MultiEdit post-edit check. Safe to re-run — it adds what is
// missing, repairs the timeout unit on its own entries, and leaves other
// tools' entries alone (per AC4 — hook registration is distinct from hook
// configuration).
// AD-16: every registered command is `${BRAND_SLUG} …`, resolved at install
// time via resolveBrandSlugSync().
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
// #384: Claude Code reads `timeout` in SECONDS (documented default 600). This
// constant was `HOOK_TIMEOUT_MS = 12000` and was written to settings.json
// verbatim, so every install shipped a 3h20m bound rather than 12s. Harmless
// while the only hooks were per-commit; load-bearing now that a hook runs on
// every edit, because the registered timeout is the sole bound on a hang on
// the interactive path (NFR-PERF-01) — the orchestrator's PostToolUse branch
// has no internal AbortController.
const HOOK_TIMEOUT_SECONDS = 12;
// #384: every tool that writes a file. Omitting one makes the hook silent for
// whichever edits arrive through it, which is the failure this issue closes.
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
    // Board r1 (security, executed; code lens concurring): `settings.json` is
    // adopter-controlled and shared with other tools. `hooks: []` survived
    // `??=`, took property assignment, and then JSON.stringify serialised the
    // Array as `[]` — every registration silently discarded while the CLI
    // printed "✓ Hook registered". `hooks.PreToolUse: {}` made `.find` a
    // TypeError that escaped to the top-level await and printed a stack trace
    // with absolute internal paths (A10), aborting `3c setup` at step 3 of 7.
    // Fail closed with the same shape malformed JSON already gets.
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
    // #242: the copy path registers BOTH PreToolUse hooks — the Bash pre-commit
    // orchestrator AND the Read|Edit|Write subagent path-guard. The path-guard
    // previously shipped only via the plugin manifest (`${CLAUDE_PLUGIN_ROOT}`);
    // with the plugin/colon distribution path retired (#247) this is its sole
    // registration. Both commands resolve via the brand slug on PATH — there is
    // no `${CLAUDE_PLUGIN_ROOT}` dependency on the copy path.
    const pathGuardCommand = `${slug} hook path-guard`;
    // #384: registers the event `orchestrator.ts` already gates post-edit
    // validation on. Without this entry the capability exists and never runs.
    const postEditCommand = `${slug} hook run --event=PostToolUse`;
    // Ensure a (matcher -> command) entry exists on the given event, preserving
    // any unrelated entries. Returns true iff it added the command.
    const ensure = (list, matcher, command) => {
        const entry = list.find((e) => e.matcher === matcher);
        if (!entry) {
            list.push({
                matcher,
                hooks: [{ type: "command", command, timeout: HOOK_TIMEOUT_SECONDS }],
            });
            return true;
        }
        entry.hooks ??= [];
        if (entry.hooks.some((h) => h.type === "command" && h.command === command)) {
            return false;
        }
        entry.hooks.push({ type: "command", command, timeout: HOOK_TIMEOUT_SECONDS });
        return true;
    };
    // Order matters: register the Bash orchestrator first so it stays PreToolUse[0].
    const added = [
        ensure(preToolUse, "Bash", hookCommand),
        ensure(preToolUse, "Read|Edit|Write", pathGuardCommand),
        ensure(postToolUse, POST_EDIT_MATCHER, postEditCommand),
    ].some(Boolean);
    // #384: repair the millisecond timeout on installs that predate this fix.
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
                // Board r1 (security + qa + code): the guard was `!== undefined`, so
                // OUR OWN entry registered with no `timeout` at all was the one case
                // never repaired — inheriting the runtime's 600s default on a hook
                // that now runs on every edit. That is the least-bounded state, and it
                // is exactly the shape a pre-#384 install can be in.
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