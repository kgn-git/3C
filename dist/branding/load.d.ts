import type { FrameworkConfig, ResolvedBrand } from "./types.js";
export declare function loadFramework(rootDir: string): Promise<FrameworkConfig>;
/**
 * The identity every substitution uses: the framework's, with `BRAND_*` as
 * aliases of `FRAMEWORK_*`.
 *
 * #451 retired custom branding — the product is 3C. There is no per-deployment
 * override any more, so nothing here reads `branding.json`; a stray one in a
 * workspace is ignored by decision (no released adopters to migrate). Before
 * #451 this read the WORKSPACE's file while the runtime resolver read the
 * PACKAGE's, so a branded install named its commands `/acme-*` while writing
 * state to `.3c/` — the half-broken state the retirement removes.
 */
export declare function resolveBrand(framework: FrameworkConfig): ResolvedBrand;
export declare function load(rootDir: string): Promise<ResolvedBrand>;
//# sourceMappingURL=load.d.ts.map