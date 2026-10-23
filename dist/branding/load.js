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
/**
 * The identity every substitution uses: the framework's, with `BRAND_*` as
 * aliases of `FRAMEWORK_*`.
 *
 * Custom branding is not supported — the product is 3C. There is no
 * per-deployment override, so nothing here reads `branding.json`; a stray one
 * in a workspace is ignored by decision (no released adopters to migrate).
 * Reading the WORKSPACE's file while the runtime resolver reads the PACKAGE's
 * would let a branded install name its commands `/acme-*` while writing state
 * to `.3c/`.
 */
export function resolveBrand(framework) {
    return {
        ...framework,
        BRAND_NAME: framework.FRAMEWORK_NAME,
        BRAND_SLUG: framework.FRAMEWORK_SLUG,
        BRAND_LONG: framework.FRAMEWORK_LONG,
        BRAND_VERSION: framework.FRAMEWORK_VERSION,
    };
}
export async function load(rootDir) {
    return resolveBrand(await loadFramework(rootDir));
}
//# sourceMappingURL=load.js.map