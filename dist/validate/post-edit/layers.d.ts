import type { LayerMap, Violation } from "./types.js";
export interface RelativeImport {
    readonly line: number;
    readonly resolved: string;
}
export declare function parseRelativeImports(filePath: string, content: string): RelativeImport[];
export declare function checkLayerImport(filePath: string, content: string, map: LayerMap): Violation[];
//# sourceMappingURL=layers.d.ts.map