export interface FrameworkConfig {
    readonly FRAMEWORK_NAME: string;
    readonly FRAMEWORK_SLUG: string;
    readonly FRAMEWORK_LONG: string;
    readonly FRAMEWORK_DOMAIN: string;
    readonly FRAMEWORK_VERSION: string;
}
export interface BrandConfig {
    readonly BRAND_NAME?: string;
    readonly BRAND_SLUG?: string;
    readonly BRAND_LONG?: string;
    readonly BRAND_VERSION?: string;
}
export type ResolvedBrand = FrameworkConfig & {
    readonly BRAND_NAME: string;
    readonly BRAND_SLUG: string;
    readonly BRAND_LONG: string;
    readonly BRAND_VERSION: string;
};
//# sourceMappingURL=types.d.ts.map