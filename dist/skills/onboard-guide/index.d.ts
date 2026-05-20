import type { Progress } from "../onboard/progress.js";
import type { Module } from "../onboard/roadmap.js";
import type { ModuleStatus } from "./view.js";
import type { CmdRunner } from "./completion.js";
export interface RunGuideOpts {
    readonly user: string;
    readonly role: string;
    readonly action?: "advance" | "ask";
    readonly query?: string;
    readonly runner?: CmdRunner;
}
export interface RunGuideResult {
    readonly roadmap: ReadonlyArray<Module>;
    readonly status: ModuleStatus;
    readonly progress: Progress;
    readonly answer?: string;
    readonly completedAll: boolean;
}
export declare function runOnboardGuide(ws: string, opts: RunGuideOpts): Promise<RunGuideResult>;
//# sourceMappingURL=index.d.ts.map