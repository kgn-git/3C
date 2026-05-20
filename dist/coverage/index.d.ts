import { type GitRunner } from "./diff.js";
import { type GateResult } from "./gate.js";
export interface RunOptions {
    readonly coverageJson?: string;
    readonly runner?: GitRunner;
}
export declare function runCoverageGate(workspaceDir: string, opts?: RunOptions): Promise<GateResult>;
//# sourceMappingURL=index.d.ts.map