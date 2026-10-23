import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const cache = new Map();
/**
 * Always FRAMEWORK_SLUG; the brand name survives because callers build `.3c/`
 * paths through it. Not an extension point: a second source splits state.
 * Sync so hook startup and path construction stay trivially composable.
 *
 * @param dir directory containing framework.json; defaults to package root.
 */
export function resolveBrandSlugSync(dir) {
    const searchDir = dir ?? defaultPackageRoot();
    const cached = cache.get(searchDir);
    if (cached !== undefined)
        return cached;
    const fwPath = join(searchDir, "framework.json");
    const fw = JSON.parse(readFileSync(fwPath, "utf8"));
    const frameworkSlug = (fw.FRAMEWORK_SLUG ?? "").trim();
    if (!frameworkSlug) {
        throw new Error(`framework.json at ${fwPath} is missing FRAMEWORK_SLUG`);
    }
    cache.set(searchDir, frameworkSlug);
    return frameworkSlug;
}
/**
 * Clear the per-directory cache. Primarily for tests; production code does
 * not need this because the brand slug is immutable for the life of a
 * deployment.
 */
export function clearBrandSlugCache() {
    cache.clear();
}
function defaultPackageRoot() {
    // When compiled, this file lives at dist/branding/runtime.js. The package
    // root (containing framework.json) is two levels up.
    return join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
}
//# sourceMappingURL=runtime.js.map