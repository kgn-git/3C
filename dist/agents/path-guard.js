// Registration-time PreToolUse policy for the L1 starter subagents.
// Returns an allow/deny decision for a (agent, tool, path) triple.
//
// AC8 (#51): test-author Edit/Write restricted to **/*.test.* and tests/**
// AC9 (#51): both agents denied Read on .env*, ~/.ssh/, ~/.aws/
const SECRET_PATTERNS = [
    /(^|[\\/])\.env(\.[\w-]+)?$/,
    /[\\/]\.ssh[\\/]/,
    /[\\/]\.aws[\\/]/,
];
const TEST_PATH_PATTERNS = [
    /(^|[\\/])tests[\\/]/,
    /\.test\.[a-zA-Z0-9]+$/,
];
const AGENT_TOOL_ALLOWLIST = {
    "code-reviewer": new Set(["Read", "Grep", "Glob"]),
    "test-author": new Set(["Read", "Grep", "Glob", "Edit", "Write"]),
};
function isSecretPath(path) {
    return SECRET_PATTERNS.some((p) => p.test(path));
}
function isTestPath(path) {
    return TEST_PATH_PATTERNS.some((p) => p.test(path));
}
export function enforceAgentPathPolicy(event) {
    const allowed = AGENT_TOOL_ALLOWLIST[event.agent];
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
    if (event.agent === "test-author" && (event.tool === "Edit" || event.tool === "Write")) {
        if (!isTestPath(event.path)) {
            return {
                allow: false,
                reason: `test-author Edit/Write is scoped to tests/** and **/*.test.* — ${event.path} is out of scope`,
            };
        }
    }
    return { allow: true };
}
//# sourceMappingURL=path-guard.js.map