// #19 AC1/AC2: per-file boundary check. The validation kernel is #16's
// checkLayerImport (reused, not reimplemented — CS-04). Non-expired
// exceptions are filtered out here.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkLayerImport, layerOf } from "../../validate/post-edit/layers.js";
import { packageSuffix, resolveRulesWithSource } from "../../validate/arch-config.js";
import { exceptionKey, isExcepted } from "../../validate/arch-exceptions.js";
export async function checkFiles(ws, files, cfg, exceptions, now) {
    const out = [];
    let evaluated = 0;
    let unmatched = 0;
    let unreadable = 0;
    let unmapped = 0;
    for (const rel of files) {
        const relPosix = rel.split("\\").join("/");
        const resolved = resolveRulesWithSource(cfg, relPosix);
        if (!resolved) {
            unmapped++;
            continue;
        }
        if (layerOf(relPosix, resolved.map) === null) {
            unmatched++;
            continue;
        }
        let content;
        try {
            content = await readFile(join(ws, rel), "utf8");
        }
        catch {
            unreadable++;
            continue;
        }
        evaluated++;
        // #427: the gate names the package block exactly as the hook does — the
        // suffix sits AFTER exceptionKey() reads the layer pair, so waivers keyed
        // on "from->to" keep matching.
        const suffix = resolved.source.kind === "package" ? packageSuffix(resolved.source.glob) : "";
        for (const v of checkLayerImport(relPosix, content, resolved.map)) {
            const key = exceptionKey(v.message);
            if (key && isExcepted(exceptions, key, now))
                continue;
            out.push({
                ruleId: "layer-boundary",
                file: relPosix,
                line: v.line,
                message: `${v.message}${suffix}`,
            });
        }
    }
    return { violations: out, evaluated, unmatched, unreadable, unmapped };
}
//# sourceMappingURL=check.js.map