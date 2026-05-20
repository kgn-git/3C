import type { ReportFormat } from "./group.js";
import type { DriftDelta, DriftReport } from "./types.js";
export interface RunDriftOpts {
    readonly format?: ReportFormat;
    readonly incremental?: boolean;
}
export interface RunDriftResult {
    readonly report: DriftReport;
    readonly delta: DriftDelta;
    readonly formatted: string;
}
export declare function runDrift(workspaceDir: string, opts: RunDriftOpts): Promise<RunDriftResult>;
//# sourceMappingURL=index.d.ts.map