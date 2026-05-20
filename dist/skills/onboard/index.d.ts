import type { Progress } from "./progress.js";
import type { Module } from "./roadmap.js";
import type { Spawn, StarterTask } from "./starter.js";
export interface RunOnboardOpts {
    readonly user: string;
    readonly level?: string;
    readonly action?: "advance" | "ask" | "starter";
    readonly query?: string;
    readonly spawn?: Spawn;
}
export interface RunOnboardResult {
    readonly roadmap: ReadonlyArray<Module>;
    readonly progress: Progress;
    readonly answer?: string;
    readonly starter?: StarterTask | null;
}
export declare function runOnboard(ws: string, opts: RunOnboardOpts): Promise<RunOnboardResult>;
//# sourceMappingURL=index.d.ts.map