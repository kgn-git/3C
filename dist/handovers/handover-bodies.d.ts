import type { GhExec, GhFailure } from "../github/gh.js";
export interface HandoverBody {
    readonly number: number;
    readonly body: string;
}
export type BodiesFetch = {
    readonly ok: true;
    readonly bodies: ReadonlyArray<HandoverBody>;
    /** Every issue number the list returned, trusted or not and past the cap or not: numbers only, so a caller can tell "not shown yet" from "left out". */
    readonly listed: ReadonlyArray<number>;
    readonly excluded: number;
    readonly capped: boolean;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
export declare function fetchHandoverBodies(repo: string, gh: GhExec): Promise<BodiesFetch>;
//# sourceMappingURL=handover-bodies.d.ts.map