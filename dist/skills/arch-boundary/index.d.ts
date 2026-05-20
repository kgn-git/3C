import type { BypassToken } from "../../hooks/bypass.js";
export interface RunArchOpts {
    readonly changedFiles?: ReadonlyArray<string>;
    readonly now?: Date;
    readonly bypassToken?: BypassToken | null;
}
export interface RunArchResult {
    readonly blocked: boolean;
    readonly message: string;
}
export declare function runArchBoundary(ws: string, opts: RunArchOpts): Promise<RunArchResult>;
//# sourceMappingURL=index.d.ts.map