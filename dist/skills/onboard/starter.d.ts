export type Spawn = (executable: string, args: ReadonlyArray<string>) => Promise<{
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
}>;
export interface StarterTask {
    readonly number: number;
    readonly title: string;
}
/**
 * What a starter search found. The two misses need different advice — "try
 * another --level" cannot fix a missing or signed-out `gh`, and telling a
 * developer without `gh` to change a label sends them in a loop.
 */
export type StarterOutcome = {
    readonly kind: "found";
    readonly task: StarterTask;
} | {
    readonly kind: "none";
} | {
    readonly kind: "unavailable";
};
export declare function findStarter(_ws: string, levelLabel: string, spawn: Spawn): Promise<StarterOutcome>;
/** The task, or null for either kind of miss. */
export declare function recommendStarter(ws: string, levelLabel: string, spawn: Spawn): Promise<StarterTask | null>;
//# sourceMappingURL=starter.d.ts.map