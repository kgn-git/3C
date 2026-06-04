// #279 — Release version single-source-of-truth.
// `package.json.version` is the single source; framework.json + the CLI --version
// derive from / are asserted equal to it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
/** Throw if package.json, framework.json, and (when given) the git tag disagree. */
export function assertVersionsAgree({ pkgVersion, frameworkVersion, tag, }) {
    if (pkgVersion !== frameworkVersion) {
        throw new Error(`version mismatch: package.json ${pkgVersion} !== framework.json ${frameworkVersion}. Run \`npm run sync:version\`.`);
    }
    if (tag !== undefined && tag !== `v${pkgVersion}`) {
        throw new Error(`release tag ${tag} does not match package.json version v${pkgVersion}.`);
    }
}
/** Return a clone of the framework config with FRAMEWORK_VERSION set to the package version. */
export function deriveFrameworkVersion(framework, pkgVersion) {
    return { ...framework, FRAMEWORK_VERSION: pkgVersion };
}
/** Read the version from the nearest package.json (defaults to the package root). */
export function readPackageVersion(packageRoot) {
    const root = packageRoot ?? join(dirname(fileURLToPath(import.meta.url)), "..");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return pkg.version;
}
//# sourceMappingURL=version.js.map