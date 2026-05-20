import { type GitRunner } from "../coverage/diff.js";
import type { Finding, Scanner } from "./findings.js";
import { type DepAdvisory } from "./deps.js";
export interface SecurityRunOptions {
    readonly scanner?: Scanner;
    readonly runner?: GitRunner;
    readonly depAdvisory?: DepAdvisory;
}
export interface SecurityGateResult {
    readonly blocked: boolean;
    readonly warnings: ReadonlyArray<Finding>;
    readonly message: string;
}
export declare function runSecurityGate(workspaceDir: string, opts?: SecurityRunOptions): Promise<SecurityGateResult>;
//# sourceMappingURL=index.d.ts.map