export interface FrameworkConfig {
    readonly FRAMEWORK_NAME: string;
    readonly FRAMEWORK_SLUG: string;
    readonly FRAMEWORK_LONG: string;
    readonly FRAMEWORK_DOMAIN: string;
    readonly FRAMEWORK_VERSION: string;
}
/**
 * The identity every substitution uses. Not an extension point: a second
 * source for these values splits state.
 */
export type ResolvedBrand = FrameworkConfig;
//# sourceMappingURL=types.d.ts.map