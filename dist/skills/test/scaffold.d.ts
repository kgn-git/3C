import type { Framework } from "./detect-framework.js";
export interface ScaffoldOptions {
    readonly framework: Exclude<Framework, "unknown">;
    readonly sourcePath: string;
    readonly workspaceDir: string;
}
export interface ScaffoldSuccess {
    readonly ok: true;
    readonly content: string;
    readonly suggestedTargetPath: string;
    readonly warnings: ReadonlyArray<string>;
}
export interface ScaffoldFailure {
    readonly ok: false;
    readonly error: string;
}
export type ScaffoldResult = ScaffoldSuccess | ScaffoldFailure;
export declare function scaffoldTest(opts: ScaffoldOptions): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map