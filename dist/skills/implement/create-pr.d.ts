import type { PreflightWarning, SpawnFn } from "../create-issue.js";
export interface PrPayload {
    readonly title: string;
    readonly body: string;
    readonly base?: string;
    readonly head?: string;
    readonly draft?: boolean;
    readonly repo?: string;
}
export interface PrRef {
    readonly url: string;
    readonly number: number;
}
export interface CreatePrOptions {
    readonly force?: boolean;
    readonly spawn?: SpawnFn;
}
export type CreatePrResult = {
    readonly ok: true;
    readonly ref: PrRef;
    readonly warnings: ReadonlyArray<PreflightWarning>;
} | {
    readonly ok: false;
    readonly warnings: ReadonlyArray<PreflightWarning>;
    readonly error?: string;
};
export declare function preflightPrBody(body: string): PreflightWarning[];
export declare function createPr(payload: PrPayload, options?: CreatePrOptions): Promise<CreatePrResult>;
//# sourceMappingURL=create-pr.d.ts.map