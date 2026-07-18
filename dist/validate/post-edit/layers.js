import { posix } from "node:path";
import { matchAny } from "../../rules/glob-match.js";
const IMPORT_RE = /^import\s.+\sfrom\s+["']([^"']+)["'];?\s*$/;
function layerOf(relPath, map) {
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
    for (let i = 0; i < lines.length; i++) {
        const m = IMPORT_RE.exec(lines[i].trim());
        if (!m)
            continue;
        const spec = m[1];
        if (!spec.startsWith("."))
            continue; // external pkg — not a layer concern
        out.push({
            line: i + 1,
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
                message: `"${fileLayer}" layer must not import from "${targetLayer}" layer`,
            });
        }
    }
    return out;
}
//# sourceMappingURL=layers.js.map