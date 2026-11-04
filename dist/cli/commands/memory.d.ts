import { type SourceDeps } from "../../handovers/delivery-source.js";
import { type StoreLimits } from "../../memory/store.js";
import type { GitRun } from "../../memory/git-probe.js";
export interface MemoryEnv {
    readonly cwd: string;
    /** Test seam for the gh and git reads; defaults to the real ones. */
    readonly deps?: SourceDeps;
    /** Test seam for the store limits; defaults to the real ones. */
    readonly limits?: StoreLimits;
    /** Test seam for the characters one sync will screen; defaults to the real budget. */
    readonly runBudget?: number;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
    /** The handover just filed; the sync reads again, once, when GitHub has not shown it yet. */
    readonly filed?: number;
    /** Test seam for the wait before that second read; defaults to a timer. */
    readonly wait?: (ms: number) => Promise<void>;
    readonly log?: (msg: string) => void;
    readonly error?: (msg: string) => void;
}
/** The first line of a sync that stopped before it finished. */
export declare const SYNC_STOPPED = "Memory not synced: the sync stopped before it finished.";
/** The lines printed when a sync stops: what happened, which error, what to do next. It never throws, because it runs inside a catch. */
export declare function stoppedLines(thrown: unknown, kept?: string): string[];
/** `3c memory sync`: rebuilds the memory; exits 1 with the cause and what to do next when it cannot. */
export declare function memoryCommand(argv: readonly string[], env: MemoryEnv): Promise<number>;
//# sourceMappingURL=memory.d.ts.map