export interface Backup {
    /** Copy `absPath` into this backup before it is overwritten. Rejects rather than lose the file. */
    readonly preserve: (absPath: string) => Promise<void>;
    /** How many files have been preserved. */
    readonly saved: number;
    /** The backup directory, or null while nothing has been preserved. */
    readonly dir: string | null;
}
/** Throws unless the deepest existing ancestor of `target` really lies inside `workspace`. */
export declare function assertInside(workspace: string, target: string): Promise<void>;
/** A backup session for one replace run in `workspace`; nothing is created until a file is preserved. */
export declare function createBackup(workspace: string, slug: string, now?: Date): Backup;
//# sourceMappingURL=backup.d.ts.map