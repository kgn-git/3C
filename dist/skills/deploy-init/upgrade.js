import { join } from "node:path";
import { verifyUpstream } from "./verify-commit.js";
export async function upgradeDeployment(opts) {
    const verify = await verifyUpstream({
        ref: opts.newUpstreamRef,
        repoDir: opts.frameworkRoot,
        runGit: opts.runGit,
    });
    if (!verify.verified) {
        return {
            ok: false,
            errors: [
                `Refusing to upgrade to unsigned upstream ${opts.newUpstreamRef}: ${verify.error ?? "no signature"}`,
            ],
        };
    }
    const configPath = join(opts.cwd, "praise.config.json");
    const config = JSON.parse(await opts.readFile(configPath));
    config.UPSTREAM_REF = opts.newUpstreamRef;
    config.FRAMEWORK_VERSION = opts.newFrameworkVersion;
    await opts.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    const marketplacePath = join(opts.cwd, ".claude-plugin", "marketplace.json");
    try {
        const market = JSON.parse(await opts.readFile(marketplacePath));
        for (const p of market.plugins)
            p.source.ref = opts.newUpstreamRef;
        await opts.writeFile(marketplacePath, JSON.stringify(market, null, 2) + "\n");
        return { ok: true, written: [configPath, marketplacePath] };
    }
    catch {
        return { ok: true, written: [configPath] };
    }
}
//# sourceMappingURL=upgrade.js.map