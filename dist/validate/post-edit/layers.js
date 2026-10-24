import { posix } from "node:path";
import { matchAny } from "../../rules/glob-match.js";
import { clampLabel } from "../arch-config.js";
// Physical lines are joined into one logical statement so wrapped clauses,
// `export … from` and bare imports are seen. Not one spanning regex:
// `[\s\S]*?from` runs past an unterminated clause into the next statement.
const STATEMENT_START = /^(?:import|export)\b/;
// Quotes and backticks are excluded too, so a string quoting an import
// (`export const HELP = \`…from "./m"…\``) is not taken for an edge.
const FROM_STATEMENT = /^(?:import|export)\b[^;'"`]*?\bfrom\s*["']([^"'\n]+)["']/;
const BARE_IMPORT = /^import\s*["']([^"'\n]+)["']/;
// CWE-400: runs on every edit; an unclosed clause must not scan to EOF.
const MAX_STATEMENT_LINES = 20;
// The per-file backstop: unresolved statements restart a join, so a
// per-statement cap alone does not bound the file (12.6s at 15MB).
const MAX_JOINED_LINES_PER_FILE = 2000;
/** The layer `relPath` belongs to under `map`, or null when no layer glob matches it. */
export function layerOf(relPath, map) {
    for (const [layer, globs] of Object.entries(map.layers)) {
        if (matchAny(globs, [relPath]))
            return layer;
    }
    return null;
}
// ESM TypeScript names a module by what it compiles to (`./cli.js`), while a
// layer glob names the source (`src/cli.ts`). The specifier as written comes
// first, so a JavaScript project's literal `.js` glob still matches.
const SOURCE_EXTENSIONS = [
    [".js", [".ts", ".tsx"]],
    [".jsx", [".tsx"]],
    [".mjs", [".mts"]],
    [".cjs", [".cts"]],
];
// A bundler or CommonJS project may import with no extension at all, naming a
// file or a directory's index.
const EXTENSIONLESS = [".ts", ".tsx", ".js", "/index.ts", "/index.tsx", "/index.js"];
/** The paths a resolved specifier can stand for: itself, then its TypeScript sources. */
function importTargets(resolved) {
    for (const [emitted, sources] of SOURCE_EXTENSIONS) {
        if (resolved.endsWith(emitted)) {
            const stem = resolved.slice(0, -emitted.length);
            return [resolved, ...sources.map((s) => stem + s)];
        }
    }
    if (posix.extname(resolved) === "")
        return [resolved, ...EXTENSIONLESS.map((s) => resolved + s)];
    return [resolved];
}
// Shared with `arch-check discover`, so a draft and the gate agree on what
// counts as an import edge.
export function parseRelativeImports(filePath, content) {
    const fileDir = posix.dirname(filePath.replace(/\\/g, "/"));
    const out = [];
    const lines = content.split("\n");
    let joined = 0; // total continuation lines consumed across the whole file
    for (let i = 0; i < lines.length; i++) {
        const first = (lines[i] ?? "").trim();
        if (!STATEMENT_START.test(first))
            continue;
        // Join physical lines until the logical statement resolves, a `;` proves
        // it never will, or the cap is reached.
        let acc = first;
        let consumed = 0;
        let m = FROM_STATEMENT.exec(acc) ?? BARE_IMPORT.exec(acc);
        while (m === null &&
            !acc.includes(";") &&
            consumed < MAX_STATEMENT_LINES &&
            joined < MAX_JOINED_LINES_PER_FILE &&
            i + consumed + 1 < lines.length) {
            // A statement start never continues the previous statement; otherwise
            // `export { z }` without `;` would swallow the next import.
            const next = (lines[i + consumed + 1] ?? "").trim();
            if (STATEMENT_START.test(next))
                break;
            consumed++;
            joined++;
            acc += "\n" + next;
            m = FROM_STATEMENT.exec(acc) ?? BARE_IMPORT.exec(acc);
        }
        if (m === null)
            continue; // not an import edge — do NOT skip these lines
        // Only a matched statement consumes its continuation lines; an
        // unresolved clause leaves them to be examined on their own.
        i += consumed;
        const spec = m[1];
        if (!spec.startsWith("."))
            continue; // external pkg — not a layer concern
        out.push({
            line: i - consumed + 1, // 1-based line the STATEMENT starts on
            resolved: posix.normalize(posix.join(fileDir, spec)),
        });
    }
    return out;
}
export function checkLayerImport(filePath, content, map) {
    const normFile = filePath.replace(/\\/g, "/");
    const fileLayer = layerOf(normFile, map);
    if (fileLayer === null)
        return [];
    const out = [];
    for (const { line, resolved } of parseRelativeImports(normFile, content)) {
        let targetLayer = null;
        for (const target of importTargets(resolved)) {
            targetLayer = layerOf(target, map);
            if (targetLayer !== null)
                break;
        }
        if (targetLayer !== null &&
            targetLayer !== fileLayer &&
            map.deny.some(([a, b]) => a === fileLayer && b === targetLayer)) {
            out.push({
                ruleId: "layer-boundary",
                line,
                // Layer names are adopter-authored YAML keys on the same advisory
                // line the package suffix guards — clamped by the same helper
                // (CWE-117). Byte-identical for any legitimate name.
                message: `"${clampLabel(fileLayer)}" layer must not import from "${clampLabel(targetLayer)}" layer`,
            });
        }
    }
    return out;
}
//# sourceMappingURL=layers.js.map