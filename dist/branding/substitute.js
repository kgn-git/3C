// Keep TOKEN_PATTERN in sync with ResolvedBrand keys (src/branding/types.ts).
const TOKEN_PATTERN = /\$\{(FRAMEWORK_NAME|FRAMEWORK_SLUG|FRAMEWORK_LONG|FRAMEWORK_DOMAIN|FRAMEWORK_VERSION)\}/g;
export function substitute(input, brand) {
    return input.replace(TOKEN_PATTERN, (_, key) => {
        const value = brand[key];
        // A missing value would otherwise be written as "undefined" into an
        // installed file name or slash command.
        if (typeof value !== "string")
            throw new Error(`no value for ${key}`);
        return value;
    });
}
//# sourceMappingURL=substitute.js.map