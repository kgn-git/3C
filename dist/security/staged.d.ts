import type { StagedAddition } from "./findings.js";
import type { GitRunner } from "./git.js";
/** Larger than this and the patch is not read whole; the gate then blocks instead of scanning part of it. */
export declare const MAX_STAGED_PATCH_BYTES: number;
/**
 * The added lines of each file in a unified patch with no context (`-U0`) whose prefixes are `a/` and `b/`. A file
 * that was deleted, or whose content did not change, adds nothing.
 */
export declare function parseStagedAdditions(patch: string): StagedAddition[];
export interface StagedRead {
    readonly additions: readonly StagedAddition[];
    /** True when the patch was too large to read whole. */
    readonly oversize: boolean;
    /** A digest of the patch that was too large, so an accepted risk covers that patch and not every later one. */
    readonly digest: string | null;
}
/** The staged additions of the repository at `workspaceDir`. A git failure throws: nothing is assumed clean. */
export declare function readStagedAdditions(workspaceDir: string, runner: GitRunner): Promise<StagedRead>;
//# sourceMappingURL=staged.d.ts.map