import type { IssuePayload, IssueRef } from "../../skills/create-issue.js";
export type { IssuePayload, IssueRef };
export type PmTool = "jira" | "linear" | "gitlab" | "github";
export interface HttpRequest {
    readonly method: "GET" | "POST";
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body?: string;
}
export interface HttpResponse {
    readonly status: number;
    readonly body: string;
}
export type HttpClient = (req: HttpRequest) => Promise<HttpResponse>;
export interface PmContext {
    readonly http: HttpClient;
    readonly token: string;
    readonly baseUrl: string;
    readonly project: string;
}
export type PmCreateResult = {
    readonly ok: true;
    readonly ref: IssueRef;
} | {
    readonly ok: false;
    readonly error: string;
};
export interface PmAdapter {
    readonly tool: PmTool;
    createIssue(payload: IssuePayload, ctx: PmContext): Promise<PmCreateResult>;
}
//# sourceMappingURL=types.d.ts.map