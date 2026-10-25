export type OnExisting = "abort" | "replace" | "replace-with-backup";
export interface WriteOptions {
    readonly targetDir: string;
    readonly content: string;
    readonly atRoot?: boolean;
    readonly onExisting?: OnExisting;
    readonly companionEnabled?: boolean;
    /** Framework slug that namespaces the backup file (e.g. `${FRAMEWORK_SLUG}` → `.pre-${FRAMEWORK_SLUG}.bak`). */
    readonly frameworkSlug?: string;
    /** Called with the existing file before `replace` or `merge` overwrites different content. */
    readonly backup?: (absPath: string) => Promise<void>;
}
export interface WriteResult {
    readonly action: "create" | "replace" | "merge" | "abort";
    readonly path: string;
    readonly backupPath?: string;
    readonly companionPath?: string;
    readonly gitignoreUpdated?: boolean;
}
export declare function writeOutput(opts: WriteOptions): Promise<WriteResult>;
//# sourceMappingURL=output.d.ts.map