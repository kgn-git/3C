import type { ArtefactInputs } from "./types.js";
export type { ArtefactInputs } from "./types.js";
export interface BrandingJson {
    readonly BRAND_NAME: string;
    readonly BRAND_SLUG: string;
    readonly BRAND_LONG: string;
    readonly BRAND_VERSION: string;
}
export declare function buildBrandingJson(i: ArtefactInputs): BrandingJson;
export interface PluginJson {
    readonly name: string;
    readonly version: string;
    readonly description: string;
}
export declare function buildPluginJson(i: ArtefactInputs): PluginJson;
export interface MarketplacePlugin {
    readonly name: string;
    readonly source: {
        readonly type: "github";
        readonly repo: string;
        readonly ref: string;
    };
}
export interface MarketplaceJson {
    readonly strict: boolean;
    readonly plugins: readonly MarketplacePlugin[];
}
export declare function buildMarketplaceJson(i: ArtefactInputs): MarketplaceJson;
export interface PraiseConfigJson {
    readonly FRAMEWORK_VERSION: string;
    readonly BRAND_SLUG: string;
    readonly BRAND_NAME: string;
    readonly UPSTREAM_REF: string;
    readonly INSTALL_UUID: string;
    readonly org_legal_entity: string;
}
export declare function buildPraiseConfigJson(i: ArtefactInputs): PraiseConfigJson;
//# sourceMappingURL=artefacts.d.ts.map