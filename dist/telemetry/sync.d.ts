export interface SyncResult {
    readonly ok: boolean;
    readonly reason?: string;
}
export interface SyncTransport {
    send(batch: ReadonlyArray<unknown>): Promise<SyncResult>;
}
export declare const notConfiguredTransport: SyncTransport;
export declare function maybeFlush(sync: {
    readonly enabled: boolean;
    readonly flushThreshold: number;
}, batch: ReadonlyArray<unknown>, transport?: SyncTransport): Promise<SyncResult | null>;
//# sourceMappingURL=sync.d.ts.map