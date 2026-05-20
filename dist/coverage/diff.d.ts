export interface FileChange {
    readonly file: string;
    readonly lines: number[];
}
export declare function parseChangedLines(diffText: string): FileChange[];
export type GitRunner = (args: string[]) => Promise<string>;
export declare function gitChangedLines(workspaceDir: string, runner?: GitRunner): Promise<FileChange[]>;
//# sourceMappingURL=diff.d.ts.map