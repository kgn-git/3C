import { type SourceDeps } from "../../handovers/delivery-source.js";
import { type GitRun } from "../../memory/git-probe.js";
import type { StoreLimits } from "../../memory/store.js";
export interface LessonsEnv {
    readonly cwd: string;
    readonly deps?: SourceDeps;
    readonly limits?: StoreLimits;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
    readonly log: (msg: string) => void;
    readonly error: (msg: string) => void;
}
/**
 * `3c memory lessons`: each lesson's figures, its exclusions and the week's new matches; exit 1 when the file or the
 * memory is refused. It refreshes a stale delivery cache first, as `3c dashboard` does, and writes nothing else.
 */
export declare function lessonsCommand(env: LessonsEnv): Promise<number>;
//# sourceMappingURL=memory-lessons.d.ts.map