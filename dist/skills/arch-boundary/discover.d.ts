/** Why the draft landed where it did (#430 AC5). `proposed` alone could not
 *  distinguish "you already have real rules" from "your active config is
 *  broken", so the CLI reused the first message for both — telling an adopter
 *  to keep a config that is currently failing the gate closed. */
export type DiscoverReason = "absent" | "inert" | "malformed" | "populated";
export interface DiscoverResult {
    readonly path: string;
    readonly proposed: boolean;
    readonly tiers: number;
    readonly reason: DiscoverReason;
}
/**
 * Render a draft architecture.yaml from (path, content) pairs — the pure core
 * of `arch-check discover`, exported for tests and reuse. `opts.proposed`
 * names the DESTINATION: the zero-tier text differs by it, because a header
 * claiming "the gate is still INERT" is false on the proposal path, where the
 * adopter's active config keeps enforcing (board r2, blocking).
 */
export declare function draftFromFiles(files: ReadonlyArray<readonly [string, string]>, opts?: {
    readonly proposed?: boolean;
    readonly activeBroken?: boolean;
}): string;
/**
 * Run discovery against a workspace. Destination matrix (#298): no config or
 * an inert one (file parses to nothing) → write `.<slug>/architecture.yaml`;
 * a populated config → write `.<slug>/architecture.proposed.yaml`, never
 * clobbering the active rules.
 */
export declare function runArchDiscover(ws: string): Promise<DiscoverResult>;
//# sourceMappingURL=discover.d.ts.map