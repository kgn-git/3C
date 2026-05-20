import type { CmdRunner, GitRunner } from "./preflight.js";
export interface RunDeployOpts {
    readonly envName: string;
    readonly confirmed?: boolean;
    readonly runner: CmdRunner;
    readonly gitRunner: GitRunner;
}
export interface RunDeployResult {
    readonly deployed: boolean;
    readonly blocked: boolean;
    readonly needsConfirmation: boolean;
    readonly rolledBack: boolean;
    readonly message: string;
}
export declare function runDeploy(ws: string, opts: RunDeployOpts): Promise<RunDeployResult>;
//# sourceMappingURL=index.d.ts.map