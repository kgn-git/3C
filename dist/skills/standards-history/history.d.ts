export interface TimelineEntry {
    readonly commit: string;
    readonly author: string;
    readonly date: string;
    readonly message: string;
    readonly pr?: string;
}
export interface HistoryOpts {
    readonly rule?: string;
}
export declare function standardsHistory(ws: string, opts: HistoryOpts): Promise<ReadonlyArray<TimelineEntry>>;
//# sourceMappingURL=history.d.ts.map