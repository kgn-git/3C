const DEFAULT_PATTERN = "feat/issue-{id}-{slug}";
const SLUG_MAX_LENGTH = 50;
export function formatBranchName(payload, config) {
    const pattern = config.branchPattern ?? DEFAULT_PATTERN;
    const slug = slugify(payload.title) || `issue-${payload.id}`;
    return pattern
        .replace("{id}", String(payload.id))
        .replace("{slug}", slug);
}
function slugify(title) {
    const normalised = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (normalised.length <= SLUG_MAX_LENGTH)
        return normalised;
    return normalised.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
}
//# sourceMappingURL=branch-name.js.map