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
    /** Commands the running CLI supports; defaults to this binary's CLI_COMMANDS. */
    supportedCommands?: ReadonlySet<string>;
    /** Subcommand pairs this framework has retired; defaults to RETIRED_COMMANDS. */
    retiredCommands?: ReadonlySet<string>;
}): Promise<DoctorReport>;
//# sourceMappingURL=doctor.d.ts.map