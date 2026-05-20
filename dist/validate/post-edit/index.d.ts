import type { PostEditResult } from "./types.js";
interface MinimalEvent {
    readonly tool_name: string;
    readonly tool_input: Record<string, unknown>;
}
export declare function postEditValidate(event: MinimalEvent, workspaceDir: string): Promise<PostEditResult>;
export {};
//# sourceMappingURL=index.d.ts.map