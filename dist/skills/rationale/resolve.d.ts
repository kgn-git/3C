import type { Rationale } from "./types.js";
export type RationaleResult = {
    readonly found: true;
    readonly ruleId: string;
    readonly rationale: Rationale;
} | {
    readonly found: false;
    readonly knownRuleIds: ReadonlyArray<string>;
};
export declare function loadRationaleByKey(workspaceDir: string, key: string): Promise<Rationale | null>;
export declare function resolveRationale(workspaceDir: string, rawRuleId: string): Promise<RationaleResult>;
//# sourceMappingURL=resolve.d.ts.map