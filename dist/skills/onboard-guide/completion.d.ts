export type CmdRunner = (command: string) => Promise<{
    exitCode: number;
}>;
export declare function recordCompletion(ws: string, user: string, runner?: CmdRunner): Promise<void>;
//# sourceMappingURL=completion.d.ts.map