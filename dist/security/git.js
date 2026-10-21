import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
/**
 * The git invocation the product actually makes when no runner is injected.
 * Exported because #408 found that `security scan` shipped with the dependency
 * half wired to `opts.runner ? … : ""` — so it ran only under tests that
 * injected one, and never once from the CLI.
 */
export const defaultGitRunner = async (args) => {
    const { stdout } = await exec("git", args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
};
//# sourceMappingURL=git.js.map