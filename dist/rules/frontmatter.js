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
        const split = splitArrayItems(inner);
        if (split === null) {
            return {
                ok: false,
                error: { line, message: 'unterminated quote in array — close the `"` or remove it' },
            };
        }
        return { ok: true, value: split.map((item) => stripQuotes(item.trim())) };
    }
    if (INTEGER.test(raw)) {
        return { ok: true, value: Number.parseInt(raw, 10) };
    }
    return { ok: true, value: stripQuotes(raw) };
}
// #464: split on commas that sit outside double quotes and outside `{…}`, so
// a brace glob (`"**/*.{ts,js}"`, quoted or not) stays one item. A `"` opens a
// quote only at the start of an item, as in YAML flow style; mid-token it is
// an ordinary character. Null when a quote is left open — merging the rest
// into one item would be a silent guess.
function splitArrayItems(inner) {
    const items = [];
    let quoted = false;
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (quoted) {
            if (c === '"')
                quoted = false;
            continue;
        }
        if (c === '"' && inner.slice(start, i).trim() === "")
            quoted = true;
        else if (c === "{")
            depth++;
        else if (c === "}")
            depth = Math.max(0, depth - 1);
        else if (c === "," && depth === 0) {
            items.push(inner.slice(start, i));
            start = i + 1;
        }
    }
    if (quoted)
        return null;
    items.push(inner.slice(start));
    return items;
}
function stripQuotes(value) {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    return value;
}
//# sourceMappingURL=frontmatter.js.map