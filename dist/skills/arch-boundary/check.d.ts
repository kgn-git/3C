import type { ArchConfig } from "./config.js";
import type { Exceptions } from "./exceptions.js";
export interface BoundaryViolation {
    readonly ruleId: "layer-boundary";
    readonly file: string;
    readonly line: number;
    readonly message: string;
}
export declare function exceptionKey(message: string): string | null;
export declare function checkFiles(ws: string, files: ReadonlyArray<string>, cfg: ArchConfig, exceptions: Exceptions, now: Date): Promise<ReadonlyArray<BoundaryViolation>>;
//# sourceMappingURL=check.d.ts.map