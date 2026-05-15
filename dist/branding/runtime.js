import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const cache = new Map();
/**
 * Resolve the deployment brand slug synchronously from framework.json
 * (+ optional branding.json).
 *
 * AD-16: deployment-local resources (datastore directories, state dirs,
 * log dirs, error-message slug references) are namespaced by ${BRAND_SLUG}.
 * When branding.json is absent or BRAND_SLUG is empty/whitespace, the
 * value defaults to ${FRAMEWORK_SLUG}.
 *
 * Sync (not async) to keep hot-path callers like hook startup, error
 * formatting, and path construction trivially composable. Cached per-dir
 * after first read; the first call costs one readFileSync of framework.json
 * (~200 bytes).
 *
 * @param dir directory containing framework.json + optional branding.json.
 *            Defaults to the installed package root.
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
    let resolved = frameworkSlug;
    try {
        const brandPath = join(searchDir, "branding.json");
        const brand = JSON.parse(readFileSync(brandPath, "utf8"));
        const override = (brand.BRAND_SLUG ?? "").trim();
        if (override.length > 0)
            resolved = override;
    }
    catch {
        // branding.json is optional and may be malformed; fall through to FRAMEWORK_SLUG.
    }
    cache.set(searchDir, resolved);
    return resolved;
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