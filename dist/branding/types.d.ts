export interface FrameworkConfig {
    readonly FRAMEWORK_NAME: string;
    readonly FRAMEWORK_SLUG: string;
    readonly FRAMEWORK_LONG: string;
    readonly FRAMEWORK_DOMAIN: string;
    readonly FRAMEWORK_VERSION: string;
}
/**
 * `BRAND_*` are aliases of `FRAMEWORK_*`, kept because templates still spell
 * `${BRAND_*}` tokens (TODO(#457) purge them). Not an extension point: a
 * second source for these values splits state.
 */
export type ResolvedBrand = FrameworkConfig & {
    readonly BRAND_NAME: string;
    readonly BRAND_SLUG: string;
    readonly BRAND_LONG: string;
    readonly BRAND_VERSION: string;
};
//# sourceMappingURL=types.d.ts.map