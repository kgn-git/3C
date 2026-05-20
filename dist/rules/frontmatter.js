// Minimal YAML-subset frontmatter parser for `.claude/rules/*.md` files.
//
// Supported shapes (per #3 frontmatter contract):
//   schema_version: 1
//   description: <string>
//   globs: ["**/*.ts", "**/*.tsx"]   or   [foo, bar]   or   []
//   priority: 5
//
// Out of scope: nested mappings, anchors, aliases, multi-line strings,
// escape processing inside double-quoted strings. If frontmatter
// outgrows this, swap to js-yaml.
const FENCE = "---";
const INTEGER = /^-?\d+$/;
export function parseFrontmatter(source) {
    // Split on LF or CRLF — rule files authored on Windows arrive CRLF and the
    // frontmatter fence must still match (`---\r` !== `---`).
    const lines = source.split(/\r?\n/);
    if (lines[0] !== FENCE) {
        return {
            ok: true,
            value: { fields: {}, body: source, bodyStartLine: 1 },
        };
    }
    let closingIdx = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === FENCE) {
            closingIdx = i;
            break;
        }
    }
    if (closingIdx === -1) {
        return {
            ok: false,
            error: { line: 1, message: "missing closing --- for frontmatter block" },
        };
    }
    const fields = {};
    for (let i = 1; i < closingIdx; i++) {
        const raw = lines[i] ?? "";
        const trimmed = raw.trim();
        if (trimmed === "")
            continue;
        if (trimmed.startsWith("#"))
            continue;
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx === -1) {
            return {
                ok: false,
                error: {
                    line: i + 1,
                    message: `missing colon in frontmatter line: expected "key: value"`,
                },
            };
        }
        const key = trimmed.slice(0, colonIdx).trim();
        const valueRaw = trimmed.slice(colonIdx + 1).trim();
        if (valueRaw === "") {
            return {
                ok: false,
                error: { line: i + 1, message: `empty value for key "${key}"` },
            };
        }
        const parsed = parseValue(valueRaw, i + 1);
        if (!parsed.ok)
            return parsed;
        fields[key] = parsed.value;
    }
    const bodyLines = lines.slice(closingIdx + 1);
    const body = bodyLines.join("\n");
    const bodyStartLine = closingIdx + 2; // 1-based line number after the closing fence
    return { ok: true, value: { fields, body, bodyStartLine } };
}
function parseValue(raw, line) {
    if (raw.startsWith("[")) {
        if (!raw.endsWith("]")) {
            return {
                ok: false,
                error: { line, message: "unclosed array (expected ])" },
            };
        }
        const inner = raw.slice(1, -1).trim();
        if (inner === "")
            return { ok: true, value: [] };
        const items = inner.split(",").map((item) => stripQuotes(item.trim()));
        return { ok: true, value: items };
    }
    if (INTEGER.test(raw)) {
        return { ok: true, value: Number.parseInt(raw, 10) };
    }
    return { ok: true, value: stripQuotes(raw) };
}
function stripQuotes(value) {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    return value;
}
//# sourceMappingURL=frontmatter.js.map