// #21 VP-01-F09 — git-native standards version history (AD-01; no DB).
// Fail-safe wrapper: every git failure becomes a structured result, never
// throws (NFR-REL-03). #166-clean: a standards-governance instrument.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
// Standards = the version-controlled governance surface.
export const STANDARDS_PATHS = [
    ".claude/rules",
    ".claude/CLAUDE.md",
    "CLAUDE.md",
    "templates",
];
export async function runGit(ws, args) {
    try {
        const { stdout } = await exec("git", [...args], {
            cwd: ws,
            maxBuffer: 32 * 1024 * 1024,
        });
        return { ok: true, stdout };
    }
    catch (err) {
        return {
            ok: false,
            stdout: "",
            error: `git ${args.join(" ")} failed: ${err.message}`,
        };
    }
}
//# sourceMappingURL=git.js.map