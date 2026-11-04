import { loadHooksConfig } from "../hooks/config.js";
import { hookLabel, hookRefusal, matcherFault } from "../hooks/refusal.js";
/**
 * What the orchestrator will do with `hooks.yaml`, read the same way it reads it: a structural fault bypasses the
 * whole chain, and a hook that holds a credential is refused on its own. A missing file or an empty list is normal.
 */
export async function hooksConfigFindings(workspaceDir, slug) {
    const file = `.${slug}/hooks.yaml`;
    const loaded = await loadHooksConfig(workspaceDir);
    if (!loaded.ok) {
        const [first, ...rest] = loaded.errors;
        const more = rest.length > 0 ? ` (and ${rest.length} more)` : "";
        return [
            {
                level: "fail",
                check: "hooks-config",
                message: `${file} is invalid, so every hook is skipped and every commit is allowed: ${first?.message ?? "it could not be read"}${more} — fix the file, then run \`${slug} doctor\` again.`,
            },
        ];
    }
    const { hooks } = loaded.config;
    if (hooks.length === 0)
        return [];
    const findings = [];
    for (const hook of hooks) {
        const refusal = matcherFault(hook.matcher, slug) ?? hookRefusal(hook.command, slug);
        if (refusal === null)
            continue;
        findings.push({
            level: hook.blocking ? "fail" : "warn",
            check: "hooks-config",
            message: `hook "${hookLabel(hook.id)}" is refused when it runs${hook.blocking ? ", which blocks the commit it would gate" : " and skipped; this blocks nothing"}: ${refusal}.`,
        });
    }
    if (findings.length > 0)
        return findings;
    return [{ level: "ok", check: "hooks-config", message: `${hooks.length} ${hooks.length === 1 ? "hook" : "hooks"} in ${file} load, and none is refused.` }];
}
//# sourceMappingURL=doctor-hooks-config.js.map