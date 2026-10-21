import { posix } from "node:path";
import { matchAny } from "../../rules/glob-match.js";
import { clampLabel } from "../arch-config.js";
// #384 AC8: the kernel used to be one line-anchored regex, which saw only
// `import X from "…"` written on a single line. It therefore missed the shape
// prettier produces by default (a wrapped clause), every `export … from`
// re-export, and every bare side-effect import. #298 recorded that bound
// honestly — but a bound is a note while the hook never fires and an
// every-edit false all-clear once #384 registers it, so it is closed here.
//
// Deliberately NOT a single spanning regex: `[\s\S]*?from` runs past the end
// of an unterminated clause and attributes the NEXT statement's specifier to
// the wrong line. Instead this joins physical lines into one logical statement
// and matches against a class that cannot cross a `;`.
const STATEMENT_START = /^(?:import|export)\b/;
// Board r1 (qa + code, both with repros): the clause class excludes QUOTES and
// backticks, not just `;`. Without that, any statement beginning `export` whose
// body quotes example code — `export const HELP = \`…import { x } from "./m"…\``,
// the exact shape of this repo's own scaffold.ts — matched and invented an
// import edge that no code performs. Verified fabricating `src/data/mod.js`
// before this change and returning [] after.
const FROM_STATEMENT = /^(?:import|export)\b[^;'"`]*?\bfrom\s*["']([^"'\n]+)["']/;
const BARE_IMPORT = /^import\s*["']([^"'\n]+)["']/;
// CWE-400: this runs on every edit once the hook is armed. An unclosed clause
// must terminate, not scan to end-of-file.
const MAX_STATEMENT_LINES = 20;
// Board r1 (security, measured): MAX_STATEMENT_LINES bounds ONE statement, not
// the file — a non-resolving statement-start line left `i` unadvanced, so every
// such line restarted a fresh join over the same text. Measured 628ms on 1MB
// and 12.6s at 15MB, past the 12s timeout the hook registers. The
// statement-start terminator below removes the quadratic term; this is the
// backstop that makes the bound a property of the FILE rather than of the
// shapes we happened to test.
const MAX_JOINED_LINES_PER_FILE = 2000;
/** The layer `relPath` belongs to under `map`, or null when no layer glob matches it. */
export function layerOf(relPath, map) {
    for (const [layer, globs] of Object.entries(map.layers)) {
        if (matchAny(globs, [relPath]))
            return layer;
    }
    return null;
}
// #298: the single import-resolution kernel — shared by the boundary check
// below and by `arch-check discover`, so a draft and the gate can never
// disagree about what counts as an import edge.
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
            // Board r1 (qa + code, both with repros): a line that itself STARTS a
            // statement can never be the continuation of the previous one. Without
            // this, `export { z }` (no `;`, the prettier `semi:false` default) joined
            // the following lines and claimed the NEXT import's specifier at the
            // wrong line — then `i += consumed` swallowed the real statement, so a
            // bare side-effect import inside the span was lost entirely. That is the
            // false all-clear this issue exists to close, reintroduced by its own
            // fix. The `;` stop made the old guard pass for a fixture-specific
            // reason; this makes the property structural.
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
        const targetLayer = layerOf(resolved, map);
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