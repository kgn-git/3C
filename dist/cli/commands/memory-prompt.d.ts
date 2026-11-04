import { type GitRun } from "../../memory/git-probe.js";
import type { StoreLimits } from "../../memory/store.js";
export interface PromptEnv {
    readonly cwd: string;
    readonly limits?: StoreLimits;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
    readonly log: (msg: string) => void;
    readonly error: (msg: string) => void;
}
/**
 * `3c memory brief <issue> --prompt`: the prompt that starts the work on an issue. It is built from the number alone,
 * so it reads no issue and no GitHub; it refuses what the brief refuses about the memory, and it prints no prompt when
 * there is no usable memory.
 */
export declare function promptCommand(issue: number, env: PromptEnv): Promise<number>;
//# sourceMappingURL=memory-prompt.d.ts.map