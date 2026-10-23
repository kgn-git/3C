export interface Progress {
    readonly user: string;
    /** Maturity level (L1/L2/…), never a role; see the migration in `loadProgress`. */
    readonly level: string | null;
    /** frontend | backend | devops, or null. */
    readonly role: string | null;
    readonly completed: ReadonlyArray<string>;
    readonly current: string | null;
    /** An unrecognised stored role, discarded on read so the caller can say so; never saved. */
    readonly droppedRole?: string | null;
}
export declare function loadProgress(ws: string, user: string): Promise<Progress>;
export declare function saveProgress(ws: string, user: string, p: Progress): Promise<void>;
//# sourceMappingURL=progress.d.ts.map