import type { HistoryOpts, TimelineEntry } from "./history.js";
import type { AsOfResult } from "./as-of.js";
export type HistoryResult = {
    readonly ok: true;
    readonly entries: ReadonlyArray<TimelineEntry>;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function runStandardsHistory(ws: string, opts: HistoryOpts): Promise<HistoryResult>;
export declare function runStandardsAsOf(ws: string, date: string): Promise<AsOfResult>;
//# sourceMappingURL=index.d.ts.map