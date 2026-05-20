export function buildBrandingJson(i) {
    return {
        BRAND_NAME: i.brandName,
        BRAND_SLUG: i.brandSlug,
        BRAND_LONG: i.brandLong,
        BRAND_VERSION: i.brandVersion,
    };
}
export function buildPluginJson(i) {
    return {
        name: i.brandSlug,
        version: i.brandVersion,
        description: `${i.brandName} — white-label deployment.`,
    };
}
export function buildMarketplaceJson(i) {
    return {
        strict: i.strict,
        plugins: [
            {
                name: i.brandSlug,
                source: {
                    type: i.upstreamSource.type,
                    repo: i.upstreamSource.repo,
                    ref: i.upstreamRef,
                },
            },
        ],
    };
}
export function buildPraiseConfigJson(i) {
    return {
        FRAMEWORK_VERSION: i.frameworkVersion,
        BRAND_SLUG: i.brandSlug,
        BRAND_NAME: i.brandName,
        UPSTREAM_REF: i.upstreamRef,
        INSTALL_UUID: i.installUuid,
        org_legal_entity: i.orgMetadata?.org_legal_entity ?? "(unset)",
    };
}
//# sourceMappingURL=artefacts.js.map