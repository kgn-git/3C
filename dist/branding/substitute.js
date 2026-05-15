// Keep TOKEN_PATTERN in sync with ResolvedBrand keys (src/branding/types.ts).
const TOKEN_PATTERN = /\$\{(FRAMEWORK_NAME|FRAMEWORK_SLUG|FRAMEWORK_LONG|FRAMEWORK_DOMAIN|FRAMEWORK_VERSION|BRAND_NAME|BRAND_SLUG|BRAND_LONG|BRAND_VERSION)\}/g;
export function substitute(input, brand) {
    return input.replace(TOKEN_PATTERN, (_, key) => brand[key]);
}
//# sourceMappingURL=substitute.js.map