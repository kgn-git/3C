export type OnExisting = "abort" | "replace" | "replace-with-backup";
export interface WriteOptions {
    readonly targetDir: string;
    readonly content: string;
    readonly atRoot?: boolean;
    readonly onExisting?: OnExisting;
    readonly companionEnabled?: boolean;
    /** Framework slug used to namespace the backup file (e.g. `${BRAND_SLUG}` → `.pre-${BRAND_SLUG}.bak`). */
    readonly frameworkSlug?: string;
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