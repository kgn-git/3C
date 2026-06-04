// #278 — Skill↔CLI version-compatibility guard.
// Installed crew skills shell out to `<slug> reconcile` (and `<slug> deps`). When the
// `<slug>` binary on PATH predates those commands, the call fails and the skill silently
// degrades. These helpers let `doctor` detect that skew.
/** Commands THIS binary supports. Reflects the binary's version (older builds lack reconcile/deps). */
export const CLI_COMMANDS = new Set([
    "init", "upgrade", "rules", "hook", "bypass", "skills", "agents", "test",
    "create-issue", "doctor", "arch-check", "deps", "reconcile", "standards",
    "deploy", "explain", "dashboard", "coverage-gate", "drift", "scan-secrets",
    "security", "debug", "bug", "onboard", "onboard-guide", "implement",
]);
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Extract CLI command tokens invoked as `<slug> <cmd>`. Anchored on a pipe or a
 * backtick so genuine invocations match but prose mentions ("the 3c framework")
 * and the slash-command form (`/3c-review-board`) do not.
 */
export function referencedCliCommands(text, slug) {
    const re = new RegExp("[|`]\\s*" + escapeRegExp(slug) + "\\s+([a-z][a-z-]+)", "g");
    const out = new Set();
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m[1])
            out.add(m[1]);
    }
    return out;
}
/** Return {skill, command} for each referenced command the running CLI does not support. */
export function checkCliSkillCompat(skills, slug, supported) {
    const out = [];
    for (const s of skills) {
        for (const cmd of referencedCliCommands(s.text, slug)) {
            if (!supported.has(cmd))
                out.push({ skill: s.name, command: cmd });
        }
    }
    return out;
}
//# sourceMappingURL=cli-compat.js.map