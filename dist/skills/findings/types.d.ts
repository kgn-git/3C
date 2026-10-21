export interface FindingsRun {
    readonly schema_version: 1;
    readonly timestamp: string;
    readonly commit: string | null;
    readonly filesScanned: number;
    readonly byRule: Readonly<Record<string, number>>;
    readonly byDirectory: Readonly<Record<string, number>>;
    readonly source?: "scan" | "external";
}
export declare function isFindingsRun(v: unknown): v is FindingsRun;
//# sourceMappingURL=types.d.ts.map