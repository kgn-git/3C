import type { Violation } from "./types.js";
export interface CoachingConfig {
    readonly enabled: boolean;
}
export declare function loadCoachingConfig(ws: string, user: string): Promise<CoachingConfig>;
export declare function seenCount(ws: string, user: string, ruleId: string): Promise<number>;
export declare function recordSeen(ws: string, user: string, ruleId: string): Promise<void>;
export declare function buildCoaching(ws: string, user: string, violations: ReadonlyArray<Violation>): Promise<string>;
//# sourceMappingURL=coaching.d.ts.map