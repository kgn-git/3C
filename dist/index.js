import { readPackageVersion } from "./version.js";
// #279: derived from package.json (the single source of truth), not hardcoded.
export const VERSION = readPackageVersion();
export { assertVersionsAgree, deriveFrameworkVersion, readPackageVersion, } from "./version.js";
//# sourceMappingURL=index.js.map