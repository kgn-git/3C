import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const cache = new Map();
/**
 * Resolve the slug synchronously from framework.json.
 *
 * Deployment-local resources (state dirs, log dirs, error-message slug
 * references) are namespaced by this slug — `.3c/`. #451 retired custom
 * branding, so this is always FRAMEWORK_SLUG: it reads no `branding.json`.
 * The name and signature are kept because 22 callers build `.3c/` paths
 * through it; #457 decides whether to rename. NOT an extension point: nothing
 * may add an override here — a second source is what split #451's state.
 *
 * Sync (not async) to keep hot-path callers like hook startup, error
 * formatting, and path construction trivially composable. Cached per-dir
 * after first read; the first call costs one readFileSync of framework.json
 * (~200 bytes).
 *
 * @param dir directory containing framework.json. Defaults to the installed
 *            package root.
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