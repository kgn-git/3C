import type { GhFailure } from "../github/gh.js";
import type { SourceDeps } from "../handovers/delivery-source.js";
import { type StoreLimits } from "./store.js";
export declare const RETRY_VERB = "3c memory sync";
export declare const RUN_CHAR_BUDGET = 20000000;
export declare const RETRY_WAIT_MS = 3000;
export interface Expecting {
    readonly number: number;
    readonly wait: (ms: number) => Promise<void>;
}
export interface SyncSummary {
    readonly repo: string;
    readonly handovers: number;
    readonly notes: number;
    /** Trusted handovers with no readable delivery block, not turned into notes. */
    readonly unreadable: number;
    /** Handovers a newer handover for the same pull request replaced. */
    readonly superseded: number;
    /** Handovers from authors who are not owners, members or collaborators. */
    readonly excluded: number;
    readonly capped: boolean;
    /** Notes left unscreened-and-unstored because the sync reached its budget of characters to screen. */
    readonly overBudget: number;
    readonly refused: {
        readonly secret: number;
        /** Pattern types only; the matched text never leaves this module. */
        readonly secretTypes: ReadonlyArray<string>;
        readonly control: number;
        readonly long: number;
        readonly wrapped: number;
        readonly fenced: number;
        readonly unclosed: number;
    };
    readonly syncedAt: string;
    /** The handover the sync was run for, when GitHub still had not listed it after the second read. */
    readonly unlisted?: number;
}
export type SyncResult = {
    readonly ok: true;
    readonly summary: SyncSummary;
} | {
    readonly ok: false;
    readonly reason: "fetch";
    readonly failure: GhFailure;
} | {
    readonly ok: false;
    readonly reason: "cap";
    readonly cap: "notes" | "bytes";
    readonly count: number;
    readonly limit: number;
};
export declare function syncMemory(ws: string, deps: SourceDeps, limits?: StoreLimits, runBudget?: number, expecting?: Expecting): Promise<SyncResult>;
//# sourceMappingURL=sync.d.ts.map