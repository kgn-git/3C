import type { DeliverySource } from "../../handovers/delivery-source.js";
import { type MemoryUse } from "../../memory/store-gate.js";
import type { PromptRow } from "./developer.js";
/** The lessons file as the repeats measure needs it: the handovers that match a lesson, or why they could not be worked out. */
export type ManagerLessons = {
    readonly kind: "matches";
    readonly handovers: ReadonlySet<number>;
} | {
    readonly kind: "absent";
} | {
    readonly kind: "empty";
} | {
    readonly kind: "refused";
    readonly where: string;
    readonly why: string;
};
export interface ManagerInputs {
    readonly memory: MemoryUse;
    readonly source: DeliverySource;
    readonly lessons: ManagerLessons;
    readonly installed: ReadonlySet<string>;
    readonly now: Date;
    /** False for the shared page, which carries no prompt; true when omitted. */
    readonly withPrompts?: boolean;
}
export interface ManagerView {
    readonly id: "manager";
    readonly label: string;
    /** Marks the view as a team-level one, which the page says in words. */
    readonly scope: "team";
    readonly results: string;
    readonly meaning: string;
    readonly nextSteps: ReadonlyArray<string>;
    readonly prompts: ReadonlyArray<PromptRow>;
}
export declare function managerView(input: ManagerInputs): ManagerView;
//# sourceMappingURL=manager.d.ts.map