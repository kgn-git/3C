import type { SpawnFn } from "../../skills/create-issue.js";
export interface BugEnvCli {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    readonly spawn?: SpawnFn;
}
export declare function bugCommand(argv: readonly string[], env?: BugEnvCli): Promise<number>;
//# sourceMappingURL=bug.d.ts.map