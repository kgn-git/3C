/** The seam a test injects to replace git. */
export type GitRunner = (args: string[]) => Promise<string>;
/** Exported so callers default to real git, not to a no-op. */
export declare const defaultGitRunner: GitRunner;
//# sourceMappingURL=git.d.ts.map