import type { Finding } from "./findings.js";
export type Severity = "critical" | "high" | "medium" | "low";
export declare const SEVERITY_ORDER: Severity[];
export declare function decideOutcome(findings: ReadonlyArray<Finding>): {
    block: boolean;
    warn: boolean;
};
//# sourceMappingURL=severity.d.ts.map