import type { ArchConfig } from "../../validate/arch-config.js";
import type { Exceptions } from "../../validate/arch-exceptions.js";
export interface BoundaryViolation {
    readonly ruleId: "layer-boundary";
    readonly file: string;
    readonly line: number;
    readonly message: string;
}
/**
 * What was found, and what was actually judged. A candidate is EVALUATED only
 * when it resolves to a LAYER under its rule map and can be read — so
 * `evaluated + unmatched + unreadable` accounts for every candidate that
 * resolved a rule map. #440: this used to count every file that resolved a
 * MAP, and a root block resolves for every path, so a config whose globs
 * matched nothing reported "37 file(s) checked" having judged none — the false
 * assurance #408 removed from the security gate, one layer in.
 */
export interface BoundaryCheckResult {
    readonly violations: ReadonlyArray<BoundaryViolation>;
    readonly evaluated: number;
    /** Candidates under a rule map that matched none of its layer globs. */
    readonly unmatched: number;
    /** Candidates in a layer that could not be read. */
    readonly unreadable: number;
    /** Candidates no rule map applies to — outside every `packages:` block, with no root block. */
    readonly unmapped: number;
}
export declare function checkFiles(ws: string, files: ReadonlyArray<string>, cfg: ArchConfig, exceptions: Exceptions, now: Date): Promise<BoundaryCheckResult>;
//# sourceMappingURL=check.d.ts.map