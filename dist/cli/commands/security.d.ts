import type { Scanner } from "../../security/findings.js";
import type { GitRunner } from "../../security/git.js";
import { type NpmRunner } from "../security-refresh.js";
export interface SecurityEnv {
    readonly cwd: string;
    readonly scanner?: Scanner;
    readonly runner?: GitRunner;
    /** Test seam for `security refresh`; defaults to `defaultNpmRunner`. */
    readonly npm?: NpmRunner;
    readonly log?: (msg: string) => void;
}
export declare function securityCommand(argv: readonly string[], env?: SecurityEnv): Promise<number>;
export interface DebugEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function debugCommand(argv: readonly string[], env?: DebugEnv): Promise<number>;
//# sourceMappingURL=security.d.ts.map