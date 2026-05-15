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
export declare function resolveBrandSlugSync(dir?: string): string;
/**
 * Clear the per-directory cache. Primarily for tests; production code does
 * not need this because the brand slug is immutable for the life of a
 * deployment.
 */
export declare function clearBrandSlugCache(): void;
//# sourceMappingURL=runtime.d.ts.map