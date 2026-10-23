#!/usr/bin/env node
import "./cli/fatal-boot.js";
export { HELP_TEMPLATE } from "./cli/help.js";
export { dashboardCommand } from "./cli/commands/dashboard.js";
export type { DashboardEnv } from "./cli/commands/dashboard.js";
export { securityCommand, debugCommand } from "./cli/commands/security.js";
export type { SecurityEnv, DebugEnv } from "./cli/commands/security.js";
export { bugCommand } from "./cli/commands/bug.js";
export type { BugEnvCli } from "./cli/commands/bug.js";
export { archCommand } from "./cli/commands/arch.js";
export type { ArchEnv } from "./cli/commands/arch.js";
export { onboardCommand } from "./cli/commands/onboard.js";
export type { OnboardEnv } from "./cli/commands/onboard.js";
export { setupCommand } from "./cli/commands/setup.js";
export declare function main(argv: readonly string[]): Promise<number>;
/**
 * True when this module is the process entry point rather than an import.
 *
 * npm installs the `3c` bin as a symlink (`node_modules/.bin/3c` ->
 * `../@kgn-git/3c/dist/cli.js`). Node reports the SYMLINK path in
 * `process.argv[1]` while `import.meta.url` resolves to the real file, so
 * comparing the two directly is always false under a normal install and
 * `main()` never runs — every command exited 0 in silence on Linux and macOS.
 * Windows was unaffected because npm writes .cmd/.ps1 shims that pass the real
 * path. Resolving argv[1] through realpath makes both invocation styles match.
 */
export declare function isDirectInvocation(moduleUrl: string, invokedPath: string | undefined): boolean;
//# sourceMappingURL=cli.d.ts.map