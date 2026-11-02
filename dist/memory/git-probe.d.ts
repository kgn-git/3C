import type { GitProbe } from "./brief.js";
export type GitRun = (args: ReadonlyArray<string>) => Promise<string | null>;
/** Runs git in `cwd` with a deadline and an output cap; null when it fails or does not answer. */
export declare function gitIn(cwd: string): GitRun;
export declare function gitProbe(run: GitRun): GitProbe;
/** Whether git tracks anything under `relative` (a path inside the repository); null when git cannot say. */
export declare function tracksAnything(run: GitRun, relative: string): Promise<boolean | null>;
//# sourceMappingURL=git-probe.d.ts.map