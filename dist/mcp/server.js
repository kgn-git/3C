// #70 AC5 — bundled MCP server: the `pm.create_issue` tool. Thin wrapper over
// the adapter registry (AD-11 centralised PM routing). The tool accepts the
// shipped IssuePayload shape so the skill UX is unchanged (AC7).
import { pmCreateIssue } from "./pm/registry.js";
export const PM_CREATE_ISSUE_TOOL = {
    name: "pm.create_issue",
    description: "Create an issue in the team's configured PM tool (Jira/Linear/GitLab) via the bundled server.",
    inputSchema: {
        type: "object",
        properties: {
            title: { type: "string" },
            body: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
            assignees: { type: "array", items: { type: "string" } },
            repo: { type: "string" },
        },
        required: ["title", "body"],
    },
};
export async function handlePmCreateIssue(payload, ctx) {
    return pmCreateIssue(payload, ctx);
}
//# sourceMappingURL=server.js.map