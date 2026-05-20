import type { PmTool } from "./types.js";
export interface PmSelection {
    readonly tool: Exclude<PmTool, "github">;
    readonly baseUrl: string;
    readonly project: string;
    readonly tokenRef: string;
}
export declare function resolvePmSelection(workspaceDir: string, toolFlag: string | undefined): Promise<PmSelection | null>;
//# sourceMappingURL=select.d.ts.map