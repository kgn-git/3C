export interface DiscoverResult {
    readonly path: string;
    readonly proposed: boolean;
    readonly tiers: number;
}
/**
 * Render a draft architecture.yaml from (path, content) pairs — the pure core
 * of `arch-check discover`, exported for tests and reuse.
 */
export declare function draftFromFiles(files: ReadonlyArray<readonly [string, string]>): string;
/**
 * Run discovery against a workspace. Destination matrix (#298): no config or
 * an inert one (file parses to nothing) → write `.<slug>/architecture.yaml`;
 * a populated config → write `.<slug>/architecture.proposed.yaml`, never
 * clobbering the active rules.
 */
export declare function runArchDiscover(ws: string): Promise<DiscoverResult>;
//# sourceMappingURL=discover.d.ts.map