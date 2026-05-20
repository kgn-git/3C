import type { PmCreateContext } from "./pm/registry.js";
import type { IssuePayload } from "../skills/create-issue.js";
import type { PmCreateResult } from "./pm/types.js";
export declare const PM_CREATE_ISSUE_TOOL: {
    readonly name: "pm.create_issue";
    readonly description: "Create an issue in the team's configured PM tool (Jira/Linear/GitLab) via the bundled server.";
    readonly inputSchema: {
        readonly type: "object";
        readonly properties: {
            readonly title: {
                readonly type: "string";
            };
            readonly body: {
                readonly type: "string";
            };
            readonly labels: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly assignees: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
            readonly repo: {
                readonly type: "string";
            };
        };
        readonly required: readonly ["title", "body"];
    };
};
export declare function handlePmCreateIssue(payload: IssuePayload, ctx: PmCreateContext): Promise<PmCreateResult>;
//# sourceMappingURL=server.d.ts.map