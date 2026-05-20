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
export function checkLayerImport(filePath, content, map) {
    const normFile = filePath.replace(/\\/g, "/");
    const fileLayer = layerOf(normFile, map);
    if (fileLayer === null)
        return [];
    const fileDir = posix.dirname(normFile);
    const out = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const m = IMPORT_RE.exec(lines[i].trim());
        if (!m)
            continue;
        const spec = m[1];
        if (!spec.startsWith("."))
            continue; // external pkg — not a layer concern
        const resolved = posix.normalize(posix.join(fileDir, spec));
        const targetLayer = layerOf(resolved, map);
        if (targetLayer !== null &&
            targetLayer !== fileLayer &&
            map.deny.some(([a, b]) => a === fileLayer && b === targetLayer)) {
            out.push({
                ruleId: "layer-boundary",
                line: i + 1,
                message: `"${fileLayer}" layer must not import from "${targetLayer}" layer`,
            });
        }
    }
    return out;
}
//# sourceMappingURL=layers.js.map