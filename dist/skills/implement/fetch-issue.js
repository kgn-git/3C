import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export async function fetchIssue(id, options = {}) {
    const args = [
        "issue",
        "view",
        String(id),
        "--json",
        "number,title,body,labels,url",
    ];
    if (options.repo !== undefined) {
        args.push("--repo", options.repo);
    }
    const spawn = options.spawn ?? defaultSpawn;
    const result = await spawn("gh", args);
    if (result.exitCode !== 0) {
        return { ok: false, error: friendlyGhError(result.stderr) };
    }
    try {
        const parsed = JSON.parse(result.stdout);
        return {
            ok: true,
            issue: {
                number: parsed.number,
                title: parsed.title,
                body: parsed.body,
                labels: Array.isArray(parsed.labels)
                    ? parsed.labels.map((l) => l.name)
                    : [],
                url: parsed.url,
            },
        };
    }
    catch (err) {
        return {
            ok: false,
            error: `gh succeeded but the JSON could not be parsed: ${err.message}`,
        };
    }
}
function friendlyGhError(stderr) {
    if (/Bad credentials|HTTP 401/i.test(stderr)) {
        return `gh authentication failed (${stderr.trim()}). Run \`gh auth login\` to authenticate.`;
    }
    if (/HTTP 404/i.test(stderr)) {
        return `gh: issue not found (${stderr.trim()}). Verify the issue id and --repo flag.`;
    }
    return `gh issue view failed: ${stderr.trim()}`;
}
const defaultSpawn = async (cmd, args) => {
    try {
        const { stdout, stderr } = await exec(cmd, [...args]);
        return { exitCode: 0, stdout, stderr };
    }
    catch (err) {
        const e = err;
        return {
            exitCode: e.code ?? 1,
            stdout: e.stdout ?? "",
            stderr: e.stderr ?? err.message,
        };
    }
};
//# sourceMappingURL=fetch-issue.js.map