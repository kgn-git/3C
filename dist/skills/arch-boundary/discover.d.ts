/** Why the draft landed where it did. `proposed` alone cannot distinguish
 *  "you already have real rules" from "your active config is broken", and one
 *  message for both would tell an adopter to keep a config that is currently
 *  failing the gate closed. */
export type DiscoverReason = "absent" | "inert" | "malformed" | "populated" | "notes";
export interface DiscoverResult {
    readonly path: string;
    readonly proposed: boolean;
    readonly tiers: number;
    readonly reason: DiscoverReason;
}
/**
 * Whether discover would draft any layer from these tracked paths. Clusters
 * depend on paths alone, so no file is read.
 */
export declare function hasClusterableSource(paths: ReadonlyArray<string>): boolean;
/**
 * Render a draft architecture.yaml from (path, content) pairs — the pure core
 * of `arch-check discover`, exported for tests and reuse. `opts.proposed`
 * names the DESTINATION: the zero-tier text differs by it, because a header
 * claiming "the gate is still INERT" is false on the proposal path, where the
 * adopter's active config keeps enforcing.
 */
export declare function draftFromFiles(files: ReadonlyArray<readonly [string, string]>, opts?: {
    readonly proposed?: boolean;
    readonly activeBroken?: boolean;
}): string;
/** A draft and where it would land, before anything is written. */
export interface DiscoverPlan extends DiscoverResult {
    readonly draft: string;
}
/**
 * Plan discovery against a workspace without writing. Destination matrix: no
 * config or an inert one (file parses to nothing) → `.<slug>/architecture.yaml`;
 * a populated or malformed config → `.<slug>/architecture.proposed.yaml`,
 * never clobbering the active rules. Throws when the workspace's tracked
 * files cannot be listed (not a git repository, or git failed).
 */
export declare function planArchDiscover(ws: string): Promise<DiscoverPlan>;
/** Write a planned draft to its destination. */
export declare function writeDiscoverPlan(plan: DiscoverPlan): Promise<DiscoverResult>;
/** Run discovery against a workspace: plan, then write (see `planArchDiscover`). */
export declare function runArchDiscover(ws: string): Promise<DiscoverResult>;
//# sourceMappingURL=discover.d.ts.map