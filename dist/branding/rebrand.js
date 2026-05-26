// #240: interactive namespace rebrand. The slash-command namespace is the
// hyphen brand prefix `${BRAND_SLUG}-`; this module resolves the chosen slug
// (defaulting to the framework slug to keep the `3c` namespace) and persists
// it to branding.json so subsequent `skills install` / `agents install` runs
// prefix every command and agent with it.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { validateBrandSlug } from "./validate.js";
/**
 * Resolve a user-entered namespace into a brand slug. Empty / whitespace input
 * keeps the framework slug (the default namespace). A non-empty value is
 * validated against the brand-slug rules (kebab-case, 3-32 chars, not reserved).
 */
export function normaliseBrandSlug(input, frameworkSlug) {
    const trimmed = input.trim();
    if (trimmed.length === 0)
        return { ok: true, slug: frameworkSlug };
    const v = validateBrandSlug(trimmed);
    if (!v.valid)
        return { ok: false, errors: v.errors };
    return { ok: true, slug: trimmed };
}
/**
 * Write (or merge) the chosen slug into branding.json under `cwd`, preserving
 * any other deployment fields already present. Returns the path written.
 */
export async function writeBrandingJson(cwd, slug) {
    const path = join(cwd, "branding.json");
    let existing = {};
    try {
        const parsed = JSON.parse(await readFile(path, "utf8"));
        if (parsed && typeof parsed === "object")
            existing = parsed;
    }
    catch {
        // No existing branding.json (or unreadable/malformed) — start fresh.
    }
    const merged = { ...existing, BRAND_SLUG: slug };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(merged, null, 2) + "\n", "utf8");
    return path;
}
/**
 * Prompt for the namespace and resolve it. `ask` is injected so the prompt is
 * testable and so the interactive readline glue stays at the call site.
 */
export async function promptForNamespace(frameworkSlug, ask) {
    const answer = await ask(`Slash-command namespace prefix? Commands install as /<prefix>-<skill>. [${frameworkSlug}]: `);
    return normaliseBrandSlug(answer, frameworkSlug);
}
//# sourceMappingURL=rebrand.js.map