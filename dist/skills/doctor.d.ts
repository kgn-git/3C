export type Level = "ok" | "warn" | "fail";
export interface Finding {
    readonly level: Level;
    readonly check: string;
    readonly message: string;
}
export interface DoctorReport {
    readonly findings: ReadonlyArray<Finding>;
    readonly ok: boolean;
}
export declare function runDoctor(opts: {
    workspaceDir: string;
    packageRoot: string;
}): Promise<DoctorReport>;
//# sourceMappingURL=doctor.d.ts.map