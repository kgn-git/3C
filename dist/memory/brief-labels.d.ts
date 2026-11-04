import type { Note } from "./notes.js";
export declare const OWN_STATEMENT = "Author's own statement, not checked: advice, blocks nothing.";
export declare const settledLabel: (handover: number) => string;
/** For each issue, the handovers that delivered it, oldest first; built once per read, from the structured `issues` of every note or delivery record. */
export type DeliveryIndex = ReadonlyMap<number, ReadonlyArray<number>>;
export declare function deliveryIndexOf(delivered: Iterable<{
    readonly handover: number;
    readonly issues: ReadonlyArray<number>;
}>): DeliveryIndex;
/** The first handover after `handover` that delivered `issue`, or null when none did. */
export declare const deliveredAfter: (index: DeliveryIndex, issue: number, handover: number) => number | null;
/** The labels a note is printed with, in a fixed order. */
export declare function labelsFor(note: Note, deliveries: DeliveryIndex): string[];
//# sourceMappingURL=brief-labels.d.ts.map