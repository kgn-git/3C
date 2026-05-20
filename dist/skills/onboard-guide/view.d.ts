import type { Module } from "../onboard/roadmap.js";
import type { Progress } from "../onboard/progress.js";
export interface ModuleStatus {
    readonly completed: ReadonlyArray<string>;
    readonly inProgress: string | null;
    readonly upcoming: ReadonlyArray<string>;
}
export declare function moduleStatus(roadmap: ReadonlyArray<Module>, progress: Progress): ModuleStatus;
//# sourceMappingURL=view.d.ts.map