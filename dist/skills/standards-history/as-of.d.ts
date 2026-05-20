export interface ManifestEntry {
    readonly path: string;
    readonly content: string;
}
export type AsOfResult = {
    readonly ok: true;
    readonly commit: string;
    readonly manifest: ReadonlyArray<ManifestEntry>;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function standardsAsOf(ws: string, date: string): Promise<AsOfResult>;
//# sourceMappingURL=as-of.d.ts.map