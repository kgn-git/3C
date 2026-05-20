import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
export function parseChangedLines(diffText) {
    const byFile = new Map();
    let current = null;
    for (const line of diffText.split("\n")) {
        if (line.startsWith("+++ b/")) {
            current = line.slice("+++ b/".length).trim().replace(/\\/g, "/");
            if (!byFile.has(current))
                byFile.set(current, []);
            continue;
        }
        const m = HUNK.exec(line);
        if (m && current) {
            const start = Number(m[1]);
            const count = m[2] === undefined ? 1 : Number(m[2]);
            for (let i = 0; i < count; i++)
                byFile.get(current).push(start + i);
        }
    }
    return [...byFile.entries()]
        .filter(([, lines]) => lines.length > 0)
        .map(([file, lines]) => ({ file, lines }));
}
const defaultRunner = async (args) => {
    const { stdout } = await exec("git", args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
};
export async function gitChangedLines(workspaceDir, runner = defaultRunner) {
    try {
        const out = await runner([
            "-C",
            workspaceDir,
            "diff",
            "--unified=0",
            "--no-color",
        ]);
        return parseChangedLines(out);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=diff.js.map