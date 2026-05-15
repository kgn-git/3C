// Output validity per AC2 of issue #1 (L1 scope).
// Checks: line-count ≤200; no top-of-file YAML frontmatter.
// Out of L1: full CommonMark parse, @import 5-hop resolution, block-only HTML
// comment enforcement — would require a parser dependency. Defer if needed.
const MAX_LINES = 200;
export function validateOutput(text) {
    const errors = [];
    // Strip a single trailing newline so "200 lines + final newline" counts as 200.
    const trimmed = text.endsWith("\n") ? text.slice(0, -1) : text;
    const lineCount = trimmed.length === 0 ? 0 : trimmed.split("\n").length;
    if (lineCount > MAX_LINES) {
        errors.push(`Output is ${lineCount} lines; CLAUDE.md should be at most ${MAX_LINES} lines (per Anthropic guidance). Move detail into .claude/rules/ files.`);
    }
    // YAML frontmatter at top of file is a `.claude/rules/` feature, not a CLAUDE.md feature.
    // Any file starting with "---" on its own line (followed by newline or EOF) is flagged.
    if (/^---(?:\n|$)/.test(text)) {
        errors.push("Output starts with YAML frontmatter ('---'); CLAUDE.md does not support frontmatter. Frontmatter is a `.claude/rules/` feature only.");
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=output-validity.js.map