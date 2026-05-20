import type { LayerMap } from "../../validate/post-edit/types.js";
export interface ArchConfig {
    readonly root: LayerMap | null;
    readonly packages: ReadonlyArray<readonly [string, LayerMap]>;
}
export declare function loadArchConfig(ws: string): Promise<ArchConfig | null>;
export declare function resolveRules(cfg: ArchConfig, relPosixPath: string): LayerMap | null;
//# sourceMappingURL=config.d.ts.map