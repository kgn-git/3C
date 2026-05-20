import type { DriftReport, DriftViolation } from "./types.js";
export declare function groupReport(violations: ReadonlyArray<DriftViolation>, filesScanned: number): DriftReport;
export type ReportFormat = "json" | "html" | "console";
export declare function formatReport(r: DriftReport, format: ReportFormat): string;
//# sourceMappingURL=group.d.ts.map