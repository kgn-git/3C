import { type Backup } from "./backup.js";
export declare const ISSUE_TEMPLATE_PATH: string;
export type IssueTemplateResult = "written" | "unchanged" | "kept" | "replaced";
export declare function installIssueTemplate(opts: {
    readonly workspace: string;
    readonly packageRoot: string;
    readonly replace?: boolean;
    readonly backup?: Backup;
}): Promise<IssueTemplateResult>;
//# sourceMappingURL=issue-template.d.ts.map