import type { SecretResolver } from "../../hooks/credentials.js";
import type { IssuePayload } from "../../skills/create-issue.js";
import type { PmAdapter, PmCreateResult, PmTool, HttpClient } from "./types.js";
export declare function adapterFor(tool: PmTool): PmAdapter | null;
export interface PmCreateContext {
    readonly tool: PmTool;
    readonly http: HttpClient;
    readonly resolver: SecretResolver;
    readonly baseUrl: string;
    readonly project: string;
    readonly tokenRef: string;
}
export declare function pmCreateIssue(payload: IssuePayload, ctx: PmCreateContext): Promise<PmCreateResult>;
//# sourceMappingURL=registry.d.ts.map