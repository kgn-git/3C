import type { LayerMap, Violation } from "./types.js";
/** The layer `relPath` belongs to under `map`, or null when no layer glob matches it. */
export declare function layerOf(relPath: string, map: LayerMap): string | null;
export interface RelativeImport {
    readonly line: number;
    readonly resolved: string;
}
export declare function parseRelativeImports(filePath: string, content: string): RelativeImport[];
export declare function checkLayerImport(filePath: string, content: string, map: LayerMap): Violation[];
//# sourceMappingURL=layers.d.ts.map