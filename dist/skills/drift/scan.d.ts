import type { DriftViolation } from "./types.js";
export interface ScanOpts {
    readonly sinceCommit?: string;
}
export declare function listSourceFiles(workspaceDir: string, opts: ScanOpts): Promise<ReadonlyArray<string>>;
export declare function scanDrift(workspaceDir: string, opts: ScanOpts): Promise<DriftViolation[]>;
export declare function dirOf(relPosixPath: string): string;
//# sourceMappingURL=scan.d.ts.map