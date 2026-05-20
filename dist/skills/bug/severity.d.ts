export declare const SEVERITIES: readonly ["critical", "high", "medium", "low"];
export type Severity = (typeof SEVERITIES)[number];
export declare function severityGuide(): string;
export declare function normalizeSeverity(input?: string): Severity;
//# sourceMappingURL=severity.d.ts.map