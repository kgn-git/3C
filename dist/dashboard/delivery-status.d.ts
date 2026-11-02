import type { DeliverySource } from "./delivery-source.js";
export interface DeliveryDescription {
    readonly header: string;
    readonly status: string;
    /** The rows shown are older than the last fetch attempt. */
    readonly stale: boolean;
    /** The last read failed, so an empty view is not a true zero. */
    readonly unread: boolean;
    readonly notes: ReadonlyArray<string>;
    /** One line per handover the view could not read, each with what to do about it. */
    readonly unreadable: ReadonlyArray<string>;
    /** Set whenever something is unreadable; the "complete" sentence is only for when it is null. */
    readonly completeness: string | null;
    readonly nextSteps: ReadonlyArray<string>;
}
/** How many unreadable handovers the console, page and panel print before counting the rest. */
export declare const UNREADABLE_SHOWN = 50;
export declare function describeDelivery(src: DeliverySource): DeliveryDescription;
//# sourceMappingURL=delivery-status.d.ts.map