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
    /** Commands the running CLI supports; defaults to this binary's CLI_COMMANDS (#278). */
    supportedCommands?: ReadonlySet<string>;
}): Promise<DoctorReport>;
//# sourceMappingURL=doctor.d.ts.map