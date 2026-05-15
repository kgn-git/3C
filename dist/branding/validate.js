const SLUG_PATTERN = /^[a-z0-9-]{3,32}$/;
const RESERVED_NAMES = new Set(["agent-skills", "claude", "claude-code"]);
const RESERVED_PREFIXES = ["anthropic-", "claude-"];
export function validateBrandSlug(slug) {
    const errors = [];
    if (!SLUG_PATTERN.test(slug)) {
        errors.push(`BRAND_SLUG "${slug}" must match ${SLUG_PATTERN.source} (lowercase letters, digits, hyphens; 3-32 chars)`);
    }
    if (RESERVED_NAMES.has(slug)) {
        errors.push(`BRAND_SLUG "${slug}" is reserved by Claude Code`);
    }
    for (const prefix of RESERVED_PREFIXES) {
        if (slug.startsWith(prefix)) {
            errors.push(`BRAND_SLUG "${slug}" starts with reserved prefix "${prefix}"`);
        }
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=validate.js.map