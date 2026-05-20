// #70 AC4/AC6 — adapter registry + the pm.create_issue dispatch. Token is
// resolved ONLY through the injected SecretResolver (OS keychain via the
// shipped defaultResolver) at call time and never cached, logged, or returned.
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
    const token = await ctx.resolver(ctx.tokenRef);
    if (token === null || token === "") {
        return {
            ok: false,
            error: `PM token not found in keychain (${ctx.tokenRef}); store it and retry`,
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