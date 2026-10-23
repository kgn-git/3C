import type { DeliverySource } from "./delivery-source.js";
export interface DeliveryDescription {
    readonly header: string;
    readonly status: string;
    /** The rows shown are older than the last fetch attempt. */
    readonly stale: boolean;
    /** The last read failed, so an empty view is not a true zero. */
    readonly unread: boolean;
    readonly notes: ReadonlyArray<string>;
    readonly nextSteps: ReadonlyArray<string>;
}
export declare function describeDelivery(src: DeliverySource): DeliveryDescription;
//# sourceMappingURL=delivery-status.d.ts.map