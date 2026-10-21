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
export declare function resolveBrandSlugSync(dir?: string): string;
/**
 * Clear the per-directory cache. Primarily for tests; production code does
 * not need this because the brand slug is immutable for the life of a
 * deployment.
 */
export declare function clearBrandSlugCache(): void;
//# sourceMappingURL=runtime.d.ts.map