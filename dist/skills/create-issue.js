// Issue Creation Skill — runtime helper.
//
// `createIssue(payload)` is the AC10 swap-point: L1 shells out to `gh
// issue create`; L2's bundled MCP server (#70 follow-on) substitutes
// `pm.create_issue` without changing the function signature or the
// skill UX.
//
// `preflight(body)` runs the AC7 secret-pattern + AC8 large-code-block
// checks before any external publish. Reuses the `scanSecrets`
// substrate completed in #71.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { scanSecrets } from "../validate/secrets.js";
const exec = promisify(execFile);
const LARGE_CODE_BLOCK_LINES = 50;
const FENCED_BLOCK = /```[\w]*\n([\s\S]*?)```/g;
export function preflight(body) {
    const warnings = [];
    // AC7: secret pattern scan via the shared substrate.
    const secretScan = scanSecrets(body);
    for (const hit of secretScan.hits) {
        const line = lineOfMatch(body, hit.match);
        warnings.push({
            type: "secret",
            line,
            message: `secret pattern detected (${hit.type}): ${hit.redacted} — remove from body or replace with a placeholder`,
        });
    }
    // AC8: large fenced code block warning.
    for (const m of body.matchAll(FENCED_BLOCK)) {
        const inner = m[1] ?? "";
        const lineCount = inner.split("\n").filter((l) => l !== "").length;
        if (lineCount > LARGE_CODE_BLOCK_LINES) {
            const line = lineOfMatch(body, m[0] ?? "");
            warnings.push({
                type: "large-code-block",
                line,
                message: `large code block (${lineCount} non-blank lines) — consider attaching a minimal repro instead`,
            });
        }
    }
    return warnings;
}
export async function createIssue(payload, options = {}) {
    const warnings = preflight(payload.body);
    const hasBlockingWarning = warnings.some((w) => w.type === "secret");
    if (hasBlockingWarning && !options.force) {
        return { ok: false, warnings };
    }
    // #70: route through the bundled MCP PM server when configured; the
    // preflight above already ran, so UX/guarantees are identical to gh.
    if (options.pmRouter) {
        const routed = await options.pmRouter(payload);
        return routed.ok
            ? { ok: true, ref: routed.ref, warnings }
            : { ok: false, warnings, error: routed.error };
    }
    const args = ["issue", "create", "--title", payload.title, "--body", payload.body];
    for (const label of payload.labels ?? []) {
        args.push("--label", label);
    }
    for (const assignee of payload.assignees ?? []) {
        args.push("--assignee", assignee);
    }
    // The skill's stdin contract allows `"repo": null` for "current repo",
    // so a null can arrive at runtime despite the optional-string type.
    if (payload.repo != null) {
        args.push("--repo", payload.repo);
    }
    const spawn = options.spawn ?? defaultSpawn;
    const result = await spawn("gh", args);
    if (result.exitCode !== 0) {
        return {
            ok: false,
            warnings,
            error: friendlyGhError(result.stderr),
        };
    }
    const ref = parseIssueUrl(result.stdout);
    if (ref === null) {
        return {
            ok: false,
            warnings,
            error: `gh succeeded but the URL could not be parsed from: ${result.stdout.trim()}`,
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
function parseIssueUrl(stdout) {
    const url = stdout.trim().split("\n").pop()?.trim() ?? "";
    const m = url.match(/\/issues\/(\d+)\/?$/);
    if (!m || m[1] === undefined)
        return null;
    return { url, number: Number.parseInt(m[1], 10) };
}
function friendlyGhError(stderr) {
    if (/Bad credentials|HTTP 401/i.test(stderr)) {
        return `gh authentication failed (${stderr.trim()}). Run \`gh auth login\` to authenticate.`;
    }
    if (/HTTP 404/i.test(stderr)) {
        return `gh: repository not found or you lack write access (${stderr.trim()}). Verify --repo and your gh token scopes.`;
    }
    return `gh issue create failed: ${stderr.trim()}`;
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
//# sourceMappingURL=create-issue.js.map