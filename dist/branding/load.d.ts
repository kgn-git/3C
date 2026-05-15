import type { BrandConfig, FrameworkConfig, ResolvedBrand } from "./types.js";
export declare function loadFramework(rootDir: string): Promise<FrameworkConfig>;
export declare function loadBrand(rootDir: string): Promise<BrandConfig>;
export declare function resolveBrand(framework: FrameworkConfig, brand: BrandConfig): ResolvedBrand;
export declare function load(rootDir: string): Promise<ResolvedBrand>;
//# sourceMappingURL=load.d.ts.map