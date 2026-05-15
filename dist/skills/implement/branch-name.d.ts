export interface BranchPayload {
    readonly id: number;
    readonly title: string;
}
export interface BranchNameConfig {
    readonly branchPattern?: string;
}
export declare function formatBranchName(payload: BranchPayload, config: BranchNameConfig): string;
//# sourceMappingURL=branch-name.d.ts.map