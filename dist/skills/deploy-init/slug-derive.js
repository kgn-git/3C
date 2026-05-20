import { validateBrandSlug } from "../../branding/validate.js";
export function deriveBrandSlug(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return { ok: false, errors: ["BRAND_NAME is empty / whitespace-only"] };
    }
    const slug = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    const validation = validateBrandSlug(slug);
    if (!validation.valid) {
        return { ok: false, errors: validation.errors };
    }
    return { ok: true, slug };
}
//# sourceMappingURL=slug-derive.js.map