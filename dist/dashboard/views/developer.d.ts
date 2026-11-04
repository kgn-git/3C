import type { DeliverySource } from "../../handovers/delivery-source.js";
import { type WeeklyMatch } from "../../memory/lessons.js";
import { type MemoryUse } from "../../memory/store-gate.js";
export type LessonsInput = {
    readonly kind: "absent";
} | {
    readonly kind: "empty";
} | {
    readonly kind: "refused";
    readonly where: string;
    readonly why: string;
}
/** `caveat` is why the merge dates may be wrong, or null when they are as fresh as a fetch can make them. */
 | {
    readonly kind: "week";
    readonly weekly: ReadonlyArray<WeeklyMatch>;
    readonly caveat: string | null;
};
export interface DeveloperInputs {
    readonly memory: MemoryUse;
    readonly source: DeliverySource;
    readonly lessons: LessonsInput;
    /** Names of the skills installed in the workspace. */
    readonly installed: ReadonlySet<string>;
}
/** One prompt, for one issue, as text to copy. */
export interface PromptRow {
    readonly issue: number;
    readonly label: string;
    readonly text: string;
}
export interface DeveloperView {
    readonly id: "developer";
    readonly label: string;
    readonly results: string;
    readonly meaning: string;
    readonly nextSteps: ReadonlyArray<string>;
    readonly prompts: ReadonlyArray<PromptRow>;
}
export declare function developerView(input: DeveloperInputs): DeveloperView;
//# sourceMappingURL=developer.d.ts.map