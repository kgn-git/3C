import type { WaitingList } from "./manager-waiting.js";
import { type MeasureId, type Measured } from "./manager-measures.js";
export declare const MEASURE_ORDER: ReadonlyArray<MeasureId>;
export declare const measureLabel: (id: MeasureId) => string;
/** The lines for one measure. `caveat` is why a figure is not a true count, or null; `why` is why an unmeasured one could not be worked out. */
export declare function measureLines(m: Measured, caveat: string | null, why?: ReadonlyArray<string>): string[];
export declare const LIST_CAP = 10;
/** What a waiting list is called, for the three places its count appears. */
export interface Nouns {
    readonly open: readonly [string, string];
    /** An issue whose state could not be read, as "the N issue(s) named". */
    readonly named: readonly [string, string];
    readonly closed: readonly [string, string];
}
/** The lines for one list of waiting issues, the issues shown, oldest first and capped, and those of them GitHub says are open. */
export declare function waitingLines(title: string, nouns: Nouns, list: WaitingList): {
    lines: string[];
    shown: number[];
    open: number[];
};
//# sourceMappingURL=manager-text.d.ts.map