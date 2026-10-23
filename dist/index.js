import { readPackageVersion } from "./version.js";
// Derived from package.json (the single source of truth), not hardcoded.
export const VERSION = readPackageVersion();
export { assertVersionsAgree, deriveFrameworkVersion, readPackageVersion, } from "./version.js";
//# sourceMappingURL=index.js.map