import type { Finding, BoardReport } from "./types.js";
/**
 * Reconcile findings from N agents into one ranked, de-duplicated report.
 * - de-dupes identical findings across agents (merging provenance);
 * - a finding flagged by multiple agents at divergent severities is marked
 *   `needsHuman` and takes the max severity;
 * - ranks blocking → warning → suggestion, then by agent agreement count;
 * - verdict is `blocking` if any blocking finding, else `advisory` if any
 *   finding, else `clean`.
 */
export declare function reconcileFindings(byAgent: Record<string, ReadonlyArray<Finding>>): BoardReport;
/** Render a BoardReport as a human-readable markdown board report. */
export declare function renderBoardReport(report: BoardReport): string;
/** Parse a `Record<agent, Finding[]>` JSON document and render its board report. */
export declare function reconcileFromJson(jsonText: string): string;
//# sourceMappingURL=reconcile.d.ts.map