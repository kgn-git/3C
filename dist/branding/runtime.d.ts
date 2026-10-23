/**
 * Always FRAMEWORK_SLUG; the brand name survives because callers build `.3c/`
 * paths through it. Not an extension point: a second source splits state.
 * Sync so hook startup and path construction stay trivially composable.
 *
 * @param dir directory containing framework.json; defaults to package root.
 */
export declare function resolveBrandSlugSync(dir?: string): string;
/**
 * Clear the per-directory cache. Primarily for tests; production code does
 * not need this because the brand slug is immutable for the life of a
 * deployment.
 */
export declare function clearBrandSlugCache(): void;
//# sourceMappingURL=runtime.d.ts.map