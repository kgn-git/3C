import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
/** Exported so callers default to real git, not to a no-op. */
export const defaultGitRunner = async (args) => {
    const { stdout } = await exec("git", args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
};
//# sourceMappingURL=git.js.map