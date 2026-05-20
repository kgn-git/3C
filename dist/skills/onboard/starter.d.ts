export type Spawn = (executable: string, args: ReadonlyArray<string>) => Promise<{
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
}>;
export interface StarterTask {
    readonly number: number;
    readonly title: string;
}
export declare function recommendStarter(_ws: string, levelLabel: string, spawn: Spawn): Promise<StarterTask | null>;
//# sourceMappingURL=starter.d.ts.map