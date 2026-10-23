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
 * resolved a rule map. Counting every file that resolved a MAP would be false
 * assurance: a root block resolves for every path, so a config whose globs
 * match nothing would report files "checked" having judged none.
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