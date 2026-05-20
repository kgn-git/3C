import { join } from "node:path";
import { deriveBrandSlug } from "./slug-derive.js";
import { validateBrandSlug } from "../../branding/validate.js";
import { buildBrandingJson, buildMarketplaceJson, buildPluginJson, buildPraiseConfigJson, } from "./artefacts.js";
import { verifyUpstream } from "./verify-commit.js";
export async function scaffoldDeployment(opts) {
    const slugResult = opts.brandSlug
        ? validateExplicit(opts.brandSlug)
        : deriveBrandSlug(opts.brandName);
    if (!slugResult.ok)
        return { ok: false, errors: slugResult.errors };
    const verify = await verifyUpstream({
        ref: opts.upstreamRef,
        repoDir: opts.frameworkRoot,
        runGit: opts.runGit,
    });
    if (!verify.verified) {
        return {
            ok: false,
            errors: [
                `Refusing unsigned upstream ${opts.upstreamRef} at ${opts.frameworkRoot}: ${verify.error ?? "no signature"}`,
            ],
        };
    }
    const inputs = {
        brandName: opts.brandName,
        brandSlug: slugResult.slug,
        brandLong: opts.brandLong ?? opts.brandName,
        brandVersion: opts.brandVersion ?? "0.1.0",
        frameworkSlug: opts.frameworkSlug,
        frameworkVersion: opts.frameworkVersion,
        upstreamRef: opts.upstreamRef,
        upstreamSource: opts.upstreamSource,
        installUuid: opts.installUuid,
        strict: opts.strict,
        orgMetadata: opts.orgMetadata,
    };
    const written = [];
    const writes = [
        [join(opts.cwd, "branding.json"), buildBrandingJson(inputs)],
        [join(opts.cwd, "praise.config.json"), buildPraiseConfigJson(inputs)],
        [join(opts.cwd, ".claude-plugin", "plugin.json"), buildPluginJson(inputs)],
        [join(opts.cwd, ".claude-plugin", "marketplace.json"), buildMarketplaceJson(inputs)],
    ];
    for (const [path, content] of writes) {
        await opts.writeFile(path, JSON.stringify(content, null, 2) + "\n");
        written.push(path);
    }
    return { ok: true, written };
}
function validateExplicit(slug) {
    const v = validateBrandSlug(slug);
    return v.valid ? { ok: true, slug } : { ok: false, errors: v.errors };
}
//# sourceMappingURL=scaffold.js.map