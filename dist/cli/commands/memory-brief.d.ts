import { type SourceDeps } from "../../handovers/delivery-source.js";
import { type GitRun } from "../../memory/git-probe.js";
import { type StoreLimits } from "../../memory/store.js";
export interface BriefEnv {
    readonly cwd: string;
    readonly deps?: SourceDeps;
    readonly limits?: StoreLimits;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
    readonly log: (msg: string) => void;
    readonly error: (msg: string) => void;
}
/** `3c memory brief <issue>`: what is decided, what to do and what earlier work says, with whether it is still current. */
export declare function briefCommand(issue: number, env: BriefEnv): Promise<number>;
//# sourceMappingURL=memory-brief.d.ts.map