// #19 AC1/AC3: load .${slug}/architecture.yaml with monorepo per-package
// rule blocks. Reuses the #16 LayerMap shape so checkLayerImport is the kernel.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { matchAny } from "../../rules/glob-match.js";
function toLayerMap(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    if (typeof o.layers !== "object" || o.layers === null)
        return null;
    const deny = Array.isArray(o.deny)
        ? o.deny.filter((d) => Array.isArray(d) &&
            d.length === 2 &&
            d.every((x) => typeof x === "string"))
        : [];
    return { layers: o.layers, deny };
}
export async function loadArchConfig(ws) {
    let raw;
    try {
        raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "architecture.yaml"), "utf8"));
    }
    catch {
        return null;
    }
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    const root = toLayerMap(raw);
    const packages = [];
    if (o.packages && typeof o.packages === "object") {
        for (const [glob, block] of Object.entries(o.packages)) {
            const m = toLayerMap(block);
            if (m)
                packages.push([glob, m]);
        }
    }
    if (root === null && packages.length === 0)
        return null;
    return { root, packages };
}
// AC3: a file under a package glob uses that package's block; otherwise the
// root block; a package without its own block inherits root.
export function resolveRules(cfg, relPosixPath) {
    for (const [glob, map] of cfg.packages) {
        if (matchAny([glob], [relPosixPath]))
            return map;
    }
    return cfg.root;
}
//# sourceMappingURL=config.js.map