// Registration-time PreToolUse policy for the L1 starter subagents.
// Returns an allow/deny decision for a (agent, tool, path) triple.
//
// Neither agent may Edit or Write: test-author returns a test body and
// /3c-test writes it through `test write`. Both are denied Read on .env*,
// ~/.ssh/, ~/.aws/.
// Case-insensitive, and matched on the name NTFS would open: a component's
// stream (`.env::$DATA`) and trailing dots and spaces are ignored there.
const SECRET_PATTERNS = [
    /(^|[\\/:])\.env(\.[\w-]+)?$/i,
    /(^|[\\/:])\.ssh[\\/]/i,
    /(^|[\\/:])\.aws[\\/]/i,
];
const asWindowsOpens = (p) => p
    .split(/[\\/]/)
    .map((s, i) => {
    const drive = i === 0 ? (/^[A-Za-z]:/.exec(s)?.[0] ?? "") : "";
    return drive + s.slice(drive.length).replace(/:.*$/, "").replace(/[. ]+$/, "");
})
    .join("/");
const AGENT_TOOL_ALLOWLIST = {
    "code-reviewer": new Set(["Read", "Grep", "Glob"]),
    "test-author": new Set(["Read", "Grep", "Glob"]),
};
function isSecretPath(path) {
    return [path, asWindowsOpens(path)].some((c) => SECRET_PATTERNS.some((p) => p.test(c)));
}
export function enforceAgentPathPolicy(event) {
    const allowed = Object.hasOwn(AGENT_TOOL_ALLOWLIST, event.agent) ? AGENT_TOOL_ALLOWLIST[event.agent] : undefined;
    if (!allowed) {
        return { allow: false, reason: `unknown/unregistered agent: ${event.agent}` };
    }
    if (!allowed.has(event.tool)) {
        return {
            allow: false,
            reason: `tool ${event.tool} not in allowlist for ${event.agent} (read-only / scoped per registration)`,
        };
    }
    if (event.tool === "Read" && isSecretPath(event.path)) {
        return {
            allow: false,
            reason: `Read denied on protected secret-path: ${event.path}`,
        };
    }
    return { allow: true };
}
//# sourceMappingURL=path-guard.js.map