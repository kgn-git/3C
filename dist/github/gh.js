// The one place 3C runs the GitHub CLI for reads. Argument vectors only, an
// explicit timeout and output cap on every call, and a closed set of failure
// states, so a caller can show "rate-limited" instead of a blank or a stack.
// The token never passes through here: gh reads its own credential store.
import { execFile } from "node:child_process";
const MAX_DETAIL = 4096;
/** Classifies an `execFile` rejection; `detail` is for the local log, never the UI. */
export function classifyGhError(err) {
    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    const detail = (stderr || `code ${String(err.code)}`).slice(0, MAX_DETAIL);
    if (err.code === "ENOENT")
        return { failure: "gh-missing", detail };
    if (err.killed === true || err.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        return { failure: "offline", detail: `gh did not finish: ${String(err.code ?? err.signal)}` };
    }
    // Rate limits first: GitHub answers a primary limit with 403, which would
    // otherwise read as a permission failure.
    if (/rate limit|HTTP 429/i.test(stderr))
        return { failure: "rate-limited", detail };
    if (/HTTP 40[13]|Bad credentials|gh auth login|not logged in/i.test(stderr)) {
        return { failure: "unauthenticated", detail };
    }
    if (/HTTP 404|Could not resolve to a Repository/i.test(stderr))
        return { failure: "not-found", detail };
    return { failure: "offline", detail };
}
export const execGh = (args, call) => new Promise((resolve) => {
    execFile("gh", [...args], { timeout: call.timeoutMs, maxBuffer: call.maxBuffer, windowsHide: true, encoding: "utf8" }, (err, stdout, stderr) => {
        if (err === null)
            resolve({ ok: true, stdout });
        else
            resolve({ ok: false, ...classifyGhError({ ...err, stderr }) });
    });
});
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const REMOTE = [
    /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/,
    /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/,
    /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/,
];
/** `owner/repo` from a github.com remote URL, or null for anything else. */
export function parseGithubRemote(url) {
    const u = url.trim();
    for (const re of REMOTE) {
        const repo = re.exec(u)?.[1];
        if (repo === undefined)
            continue;
        if (!REPO.test(repo) || repo.split("/").some((part) => part === "." || part === ".."))
            return null;
        return repo;
    }
    return null;
}
/** The `origin` remote's repository, read from git config without a network call. */
export function originRepo(cwd) {
    return new Promise((resolve) => {
        execFile("git", ["remote", "get-url", "origin"], { cwd, timeout: 5_000, windowsHide: true, encoding: "utf8" }, (err, stdout) => resolve(err === null ? parseGithubRemote(stdout) : null));
    });
}
//# sourceMappingURL=gh.js.map