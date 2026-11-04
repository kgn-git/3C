import type { GitProbe } from "./brief.js";
export type GitRun = (args: ReadonlyArray<string>) => Promise<string | null>;
export declare const GIT_TIMEOUT_MS = 10000;
export declare const GIT_MAX_BUFFER: number;
export interface GitCall {
    readonly timeoutMs: number;
    readonly maxBuffer: number;
}
/** The part of `execFile` that git is started through, so a test can see the limits it is given. */
export type GitExec = (file: string, args: string[], options: {
    cwd: string;
    timeout: number;
    maxBuffer: number;
    windowsHide: boolean;
    encoding: "utf8";
}, done: (err: Error | null, stdout: string) => void) => unknown;
/** Runs git in `cwd` with a deadline and an output cap; null when it fails or does not answer. */
export declare function gitIn(cwd: string, call?: GitCall, start?: GitExec): GitRun;
export declare function gitProbe(run: GitRun): GitProbe;
/** Whether git tracks anything under `relative` (a path inside the repository); null when git cannot say. */
export declare function tracksAnything(run: GitRun, relative: string): Promise<boolean | null>;
//# sourceMappingURL=git-probe.d.ts.map