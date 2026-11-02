import { type SourceDeps } from "../handovers/delivery-source.js";
export declare const RETRY_MS = 60000;
export declare class DeliveryRefresher {
    private readonly ws;
    private readonly deps;
    private inflight;
    private lastFailedAt;
    constructor(ws: string, deps: SourceDeps);
    ensureFresh(): Promise<void>;
}
//# sourceMappingURL=delivery-refresher.d.ts.map