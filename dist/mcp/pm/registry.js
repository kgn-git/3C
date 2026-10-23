// Adapter registry + the pm.create_issue dispatch. Token is
// resolved ONLY through the injected SecretResolver (OS keychain via the
// shipped defaultResolver) at call time and never cached, logged, or returned.
import { credentialLookupHint, credentialStoreName, isValidCredentialName, } from "../../hooks/credentials.js";
import { jiraAdapter } from "./jira.js";
import { linearAdapter } from "./linear.js";
import { gitlabAdapter } from "./gitlab.js";
const ADAPTERS = {
    jira: jiraAdapter,
    linear: linearAdapter,
    gitlab: gitlabAdapter,
};
export function adapterFor(tool) {
    return ADAPTERS[tool] ?? null; // "github" intentionally absent — stays on gh path
}
export async function pmCreateIssue(payload, ctx) {
    const adapter = adapterFor(ctx.tool);
    if (!adapter) {
        return { ok: false, error: `no PM adapter for "${ctx.tool}"` };
    }
    // A name no store can hold is a configuration error, not a missing entry:
    // telling the user to store it would send them in a circle.
    if (!isValidCredentialName(ctx.tokenRef)) {
        return {
            ok: false,
            error: `PM token entry name "${ctx.tokenRef}" is invalid — use letters, digits, ".", "_" and "-" (at most 128).`,
        };
    }
    const token = await ctx.resolver(ctx.tokenRef);
    if (token === null || token === "") {
        // Keychain only — no environment fallback — so the refusal says
        // exactly what to store, where, and in what form.
        const p = process.platform;
        return {
            ok: false,
            error: `PM token "${ctx.tokenRef}" was not found in, or could not be read from, your ${credentialStoreName(p)} ` +
                `(expected ${credentialLookupHint(p, ctx.tokenRef)}). Store it there first, then retry.`,
        };
    }
    return adapter.createIssue(payload, {
        http: ctx.http,
        token,
        baseUrl: ctx.baseUrl,
        project: ctx.project,
    });
}
//# sourceMappingURL=registry.js.map