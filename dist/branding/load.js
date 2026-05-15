import { readFile } from "node:fs/promises";
import { join } from "node:path";
const FRAMEWORK_FIELDS = [
    "FRAMEWORK_NAME",
    "FRAMEWORK_SLUG",
    "FRAMEWORK_LONG",
    "FRAMEWORK_DOMAIN",
    "FRAMEWORK_VERSION",
];
export async function loadFramework(rootDir) {
    const path = join(rootDir, "framework.json");
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text);
    for (const field of FRAMEWORK_FIELDS) {
        const value = parsed[field];
        if (typeof value !== "string" || value.length === 0) {
            throw new Error(`framework.json: required field "${field}" is missing or empty`);
        }
    }
    return parsed;
}
export async function loadBrand(rootDir) {
    const path = join(rootDir, "branding.json");
    let text;
    try {
        text = await readFile(path, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return {};
        }
        throw err;
    }
    return JSON.parse(text);
}
export function resolveBrand(framework, brand) {
    const fallback = (override, fw) => {
        const trimmed = override?.trim();
        return trimmed && trimmed.length > 0 ? trimmed : fw;
    };
    return {
        ...framework,
        BRAND_NAME: fallback(brand.BRAND_NAME, framework.FRAMEWORK_NAME),
        BRAND_SLUG: fallback(brand.BRAND_SLUG, framework.FRAMEWORK_SLUG),
        BRAND_LONG: fallback(brand.BRAND_LONG, framework.FRAMEWORK_LONG),
        BRAND_VERSION: fallback(brand.BRAND_VERSION, framework.FRAMEWORK_VERSION),
    };
}
export async function load(rootDir) {
    const framework = await loadFramework(rootDir);
    const brand = await loadBrand(rootDir);
    return resolveBrand(framework, brand);
}
//# sourceMappingURL=load.js.map