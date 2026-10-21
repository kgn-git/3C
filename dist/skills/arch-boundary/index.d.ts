import type { BypassToken } from "../../hooks/bypass.js";
export interface RunArchOpts {
    readonly changedFiles?: ReadonlyArray<string>;
    readonly now?: Date;
    readonly bypassToken?: BypassToken | null;
}
export interface RunArchResult {
    readonly blocked: boolean;
    readonly message: string;
    readonly notConfigured?: boolean;
    readonly configState?: "absent" | "inert";
    readonly configError?: boolean;
    readonly treeUnreadable?: boolean;
    readonly filesChecked?: number;
    readonly filesUnmatched?: number;
    readonly filesUnreadable?: number;
    readonly filesUnmapped?: number;
}
/** Why the gate could not list the files to check, and what the adopter can do about it (#434). */
export interface GitFailure {
    readonly cause: string;
    readonly repair: string;
}
/**
 * Classify a failed git invocation. Codes first — `ENOENT` and Node's
 * maxBuffer code are locale-proof; only "not a repository" needs git's own
 * words, and a localised git simply lands in the generic class, whose repair
 * still works.
 */
export declare function classifyGitFailure(err: unknown): GitFailure;
export declare function runArchBoundary(ws: string, opts: RunArchOpts): Promise<RunArchResult>;
//# sourceMappingURL=index.d.ts.map