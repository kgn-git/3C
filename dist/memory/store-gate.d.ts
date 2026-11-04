import { type GitRun } from "./git-probe.js";
import { type Store, type StoreLimits } from "./store.js";
export interface Refusal {
    readonly why: string;
    /** The shortest fix that clears this refusal, so the next run does not refuse for the same reason. */
    readonly next: string;
}
/** The two lines a command prints when the memory was refused; `who` is the command's own name, such as "Memory brief". */
export declare const refusalLines: (who: string, refusal: Refusal) => [string, string];
/** What a command finds when it reads the memory: none yet, one it may not use, or the store itself. */
export type MemoryUse = {
    readonly kind: "absent";
} | {
    readonly kind: "refused";
    readonly refusal: Refusal;
} | {
    readonly kind: "usable";
    readonly store: Store;
};
export declare function readUsableStore(ws: string, run: GitRun, limits?: StoreLimits): Promise<MemoryUse>;
//# sourceMappingURL=store-gate.d.ts.map