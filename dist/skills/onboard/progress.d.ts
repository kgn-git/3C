export interface Progress {
    readonly user: string;
    /** Maturity level (L1/L2/…) — never a role. See the migration below. */
    readonly level: string | null;
    /** frontend | backend | devops, or null. Added by #399. */
    readonly role: string | null;
    readonly completed: ReadonlyArray<string>;
    readonly current: string | null;
    /**
     * A stored role this build does not recognise, discarded on read (#399 r2).
     *
     * Transient: it is never written back, and exists only so the caller can TELL
     * the developer their role was dropped. Optional so `saveProgress` and every
     * constructed `Progress` stay unchanged.
     */
    readonly droppedRole?: string | null;
}
export declare function loadProgress(ws: string, user: string): Promise<Progress>;
export declare function saveProgress(ws: string, user: string, p: Progress): Promise<void>;
//# sourceMappingURL=progress.d.ts.map