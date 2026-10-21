#!/usr/bin/env node
import "./cli/fatal-boot.js";
import type { GitRunner } from "./security/git.js";
import type { Scanner } from "./security/findings.js";
import type { Spawn } from "./skills/onboard/starter.js";
import type { SpawnFn } from "./skills/create-issue.js";
export declare const HELP_TEMPLATE: string;
export interface DashboardEnv {
    readonly cwd: string;
    readonly now?: Date;
    readonly open?: (path: string) => Promise<void>;
    /** Handover artefact directory; defaults to `<cwd>/docs` (the convention). */
    readonly docsDir?: string;
    /** Output seam (#341 convention); defaults to console.log. */
    readonly log?: (msg: string) => void;
    /**
     * Resolves when the served app should shut down (#346 AC9). Defaults to
     * waiting for SIGINT; injected in tests so nothing has to raise a real signal.
     */
    readonly waitForShutdown?: () => Promise<void>;
    /** Bundle directory; defaults to the dist/ui built by `npm run build`. */
    readonly assetDir?: string;
}
export declare function dashboardCommand(argv: readonly string[], env?: DashboardEnv): Promise<number>;
export interface SecurityEnv {
    readonly cwd: string;
    readonly scanner?: Scanner;
    readonly runner?: GitRunner;
    readonly log?: (msg: string) => void;
}
export declare function securityCommand(argv: readonly string[], env?: SecurityEnv): Promise<number>;
export interface DebugEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function debugCommand(argv: readonly string[], env?: DebugEnv): Promise<number>;
export interface BugEnvCli {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    readonly spawn?: SpawnFn;
}
export declare function bugCommand(argv: readonly string[], env?: BugEnvCli): Promise<number>;
export interface ArchEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function archCommand(argv: readonly string[], env?: ArchEnv): Promise<number>;
export interface OnboardEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    /** The OS account name. Injectable so the default-name path is testable (#378 AC4). */
    readonly osUser?: () => string;
    /** The `gh` runner for `--starter`. Injectable so each starter outcome is testable (#343). */
    readonly spawn?: Spawn;
}
export declare function onboardCommand(argv: readonly string[], env?: OnboardEnv): Promise<number>;
export declare function setupCommand(argv: readonly string[]): Promise<number>;
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