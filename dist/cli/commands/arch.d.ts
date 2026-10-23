export interface ArchEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function archCommand(argv: readonly string[], env?: ArchEnv): Promise<number>;
//# sourceMappingURL=arch.d.ts.map