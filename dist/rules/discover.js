// Workspace file discovery via `git ls-files`. Forward-slash paths,
// respects .gitignore, fast on large repos. Required by AC1 (glob match
// runs against the workspace's tracked file set).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export async function discoverWorkspaceFiles(workspaceDir) {
    try {
        const { stdout } = await exec("git", ["ls-files"], {
            cwd: workspaceDir,
            maxBuffer: 32 * 1024 * 1024, // 32 MB; ample for L1 repo sizes per NFR-PERF-01
        });
        const files = stdout.split(/\r?\n/).filter((line) => line !== "");
        return { ok: true, files };
    }
    catch (err) {
        return {
            ok: false,
            error: `git ls-files failed in ${workspaceDir}: ${err.message}`,
        };
    }
}
//# sourceMappingURL=discover.js.map