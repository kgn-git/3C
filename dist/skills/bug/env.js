import { platform, release } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function captureEnv(opts = {}) {
    const os = `${platform()} ${release()}`;
    let appVersion = "unknown";
    try {
        const root = opts.packageRoot ?? process.cwd();
        const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
        if (typeof pkg.version === "string")
            appVersion = pkg.version;
    }
    catch {
        /* keep "unknown" */
    }
    let commitSha = "unknown";
    try {
        if (opts.gitRunner)
            commitSha = (await opts.gitRunner()).trim() || "unknown";
    }
    catch {
        /* keep "unknown" */
    }
    return { os, appVersion, commitSha };
}
//# sourceMappingURL=env.js.map