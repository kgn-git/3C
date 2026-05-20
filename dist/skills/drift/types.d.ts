export interface DriftViolation {
    readonly ruleId: string;
    readonly file: string;
    readonly line: number;
    readonly message: string;
}
export interface DriftReport {
    readonly filesScanned: number;
    readonly total: number;
    readonly byRule: Readonly<Record<string, number>>;
    readonly byDirectory: Readonly<Record<string, number>>;
    readonly violations: ReadonlyArray<DriftViolation>;
}
export interface DriftRun {
    readonly schema_version: 1;
    readonly timestamp: string;
    readonly commit: string | null;
    readonly filesScanned: number;
    readonly byRule: Readonly<Record<string, number>>;
    readonly byDirectory: Readonly<Record<string, number>>;
    readonly source?: "scan" | "external";
}
export interface DriftDelta {
    readonly byRule: Readonly<Record<string, number>>;
    readonly hasPrevious: boolean;
}
export declare function isDriftRun(v: unknown): v is DriftRun;
//# sourceMappingURL=types.d.ts.map