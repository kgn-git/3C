export interface FrameworkConfig {
    readonly FRAMEWORK_NAME: string;
    readonly FRAMEWORK_SLUG: string;
    readonly FRAMEWORK_LONG: string;
    readonly FRAMEWORK_DOMAIN: string;
    readonly FRAMEWORK_VERSION: string;
}
/**
 * The framework identity plus the `BRAND_*` names, which are ALIASES of the
 * `FRAMEWORK_*` values (#451). Custom branding is retired — the product is 3C —
 * but 56 template files still spell `${BRAND_*}` tokens, so the names stay
 * resolvable until #457 purges them from `templates/`.
 *
 * NOT an extension point: nothing may add a per-deployment override here. A
 * second source for these values is what made #451's split state possible.
 */
export type ResolvedBrand = FrameworkConfig & {
    readonly BRAND_NAME: string;
    readonly BRAND_SLUG: string;
    readonly BRAND_LONG: string;
    readonly BRAND_VERSION: string;
};
//# sourceMappingURL=types.d.ts.map