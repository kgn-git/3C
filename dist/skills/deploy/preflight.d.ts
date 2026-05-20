import type { DeployConfig } from "./config.js";
export type CmdRunner = (command: string) => Promise<{
    exitCode: number;
}>;
export type GitRunner = (args: ReadonlyArray<string>) => Promise<string>;
export interface PreflightDeps {
    readonly runner: CmdRunner;
    readonly gitRunner: GitRunner;
}
export interface PreflightResult {
    readonly ok: boolean;
    readonly failed: ReadonlyArray<string>;
}
export declare function preflight(cfg: DeployConfig, deps: PreflightDeps): Promise<PreflightResult>;
//# sourceMappingURL=preflight.d.ts.map