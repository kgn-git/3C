import type { Presentation } from "../output/index.js";
import { type GitRun } from "../memory/git-probe.js";
import type { PromptRow } from "./views/developer.js";
export interface Panel extends Presentation {
    /** Stable identifier — keys the UI tabs. */
    readonly id: string;
    /** Human label for the tab. */
    readonly label: string;
    /** Prompts a person copies to start work; text only, never run by the page. */
    readonly prompts?: ReadonlyArray<PromptRow>;
    /** Set on a panel that describes the team, never a person. */
    readonly scope?: "team";
}
export interface DashboardState {
    readonly brand: string;
    readonly generatedAt: string;
    readonly panels: ReadonlyArray<Panel>;
}
export interface StateEnv {
    readonly cwd: string;
    readonly since?: string;
    readonly now?: Date;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
}
/** Builds every panel the local dashboard app renders. Performs no network call. */
export declare function buildDashboardState(given: StateEnv): Promise<DashboardState>;
//# sourceMappingURL=state.d.ts.map