import type { FrameworkConfig, ResolvedBrand } from "./types.js";
export declare function loadFramework(rootDir: string): Promise<FrameworkConfig>;
/**
 * The identity every substitution uses: the framework's, with `BRAND_*` as
 * aliases of `FRAMEWORK_*`.
 *
 * Custom branding is not supported — the product is 3C. There is no
 * per-deployment override, so nothing here reads `branding.json`; a stray one
 * in a workspace is ignored by decision (no released adopters to migrate).
 * Reading the WORKSPACE's file while the runtime resolver reads the PACKAGE's
 * would let a branded install name its commands `/acme-*` while writing state
 * to `.3c/`.
 */
export declare function resolveBrand(framework: FrameworkConfig): ResolvedBrand;
export declare function load(rootDir: string): Promise<ResolvedBrand>;
//# sourceMappingURL=load.d.ts.map