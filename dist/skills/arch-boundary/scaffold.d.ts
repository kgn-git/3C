export interface ScaffoldResult {
    readonly created: boolean;
    readonly path: string;
}
/**
 * Write the commented starter to `.<slug>/architecture.yaml`. Never clobbers an
 * existing file — returns `{ created: false }` if one is already present.
 */
export declare function writeStarterArchConfig(ws: string, slug: string): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map