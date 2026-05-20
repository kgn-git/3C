export interface Progress {
    readonly user: string;
    readonly level: string | null;
    readonly completed: ReadonlyArray<string>;
    readonly current: string | null;
}
export declare function loadProgress(ws: string, user: string): Promise<Progress>;
export declare function saveProgress(ws: string, user: string, p: Progress): Promise<void>;
//# sourceMappingURL=progress.d.ts.map