import type { Presentation } from "../output/index.js";
export interface Panel extends Presentation {
    /** Stable identifier — keys the UI tabs. */
    readonly id: string;
    /** Human label for the tab. */
    readonly label: string;
}
export interface DashboardState {
    readonly brand: string;
    readonly generatedAt: string;
    readonly panels: ReadonlyArray<Panel>;
}
export interface StateEnv {
    readonly cwd: string;
    readonly docsDir?: string;
    readonly since?: string;
    readonly now?: Date;
}
/** Builds every panel the local dashboard app renders. Performs no network call. */
export declare function buildDashboardState(env: StateEnv): Promise<DashboardState>;
//# sourceMappingURL=state.d.ts.map