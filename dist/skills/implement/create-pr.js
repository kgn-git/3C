import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanSecrets } from "../../validate/secrets.js";
const exec = promisify(execFile);
export function preflightPrBody(body) {
    const warnings = [];
    const secretScan = scanSecrets(body);
    for (const hit of secretScan.hits) {
        const line = lineOfMatch(body, hit.match);
        warnings.push({
            type: "secret",
            line,
            message: `secret pattern detected (${hit.type}): ${hit.redacted} — remove from PR body or replace with a placeholder`,
        });
    }
    return warnings;
}
export async function createPr(payload, options = {}) {
    const warnings = preflightPrBody(payload.body);
    const hasBlockingWarning = warnings.some((w) => w.type === "secret");
    if (hasBlockingWarning && !options.force) {
        return { ok: false, warnings };
    }
    const args = [
        "pr",
        "create",
        "--title",
        payload.title,
        "--body",
        payload.body,
    ];
    if (payload.base !== undefined)
        args.push("--base", payload.base);
    if (payload.head !== undefined)
        args.push("--head", payload.head);
    if (payload.draft === true)
        args.push("--draft");
    if (payload.repo !== undefined)
        args.push("--repo", payload.repo);
    const spawn = options.spawn ?? defaultSpawn;
    const result = await spawn("gh", args);
    if (result.exitCode !== 0) {
        return { ok: false, warnings, error: friendlyGhError(result.stderr) };
    }
    const ref = parsePrUrl(result.stdout);
    if (ref === null) {
        return {
            ok: false,
            warnings,
            error: `gh succeeded but the PR URL could not be parsed from: ${result.stdout.trim()}`,
        };
    }
    return { ok: true, ref, warnings };
}
function lineOfMatch(body, match) {
    const idx = body.indexOf(match);
    if (idx === -1)
        return 1;
    return body.slice(0, idx).split("\n").length;
}
// Regex assumes gh pr create emits a bare /pull/N URL (no sub-path, no query string).
// Verified against gh CLI 2.x. Revisit if gh ever appends ?created=1 or /files etc.
function parsePrUrl(stdout) {
    const url = stdout.trim().split("\n").pop()?.trim() ?? "";
    const m = url.match(/\/pull\/(\d+)\/?$/);
    if (!m || m[1] === undefined)
        return null;
    return { url, number: Number.parseInt(m[1], 10) };
}
function friendlyGhError(stderr) {
    if (/Bad credentials|HTTP 401/i.test(stderr)) {
        return `gh authentication failed (${stderr.trim()}). Run \`gh auth login\` to authenticate.`;
    }
    if (/HTTP 404/i.test(stderr)) {
        return `gh: repository or base ref not found (${stderr.trim()}). Verify --repo and that the base branch exists.`;
    }
    return `gh pr create failed: ${stderr.trim()}`;
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
//# sourceMappingURL=create-pr.js.map