export interface UpstreamSource {
    readonly type: "github";
    readonly repo: string;
}
export interface OrgMetadata {
    readonly org_legal_entity: string;
}
export interface ArtefactInputs {
    readonly brandName: string;
    readonly brandSlug: string;
    readonly brandLong: string;
    readonly brandVersion: string;
    readonly frameworkSlug: string;
    readonly frameworkVersion: string;
    readonly upstreamRef: string;
    readonly upstreamSource: UpstreamSource;
    readonly installUuid: string;
    readonly strict: boolean;
    readonly orgMetadata?: OrgMetadata;
}
//# sourceMappingURL=types.d.ts.map