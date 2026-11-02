// What git says about the repository's default branch, asked with argument vectors only. Every value that reaches
// an argument is a number or a date this module checked, or a path brief-text.ts checked and that follows `--`, and
// paths are taken literally, so a name from an issue body can never be read as an option or a pathspec (CWE-88).
import { execFile } from "node:child_process";
import { isSafePath } from "./brief-text.js";
// The remote's branch is preferred, because a merged change that has not been pulled yet is still a merged change.
const BRANCHES = ["origin/main", "origin/master", "main", "master"];
const LIMIT = "20";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LITERAL = "--literal-pathspecs";
/** Runs git in `cwd` with a deadline and an output cap; null when it fails or does not answer. */
export function gitIn(cwd) {
    return (args) => new Promise((resolve) => {
        execFile("git", [...args], { cwd, timeout: 10_000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: "utf8" }, (err, stdout) => resolve(err === null ? stdout : null));
    });
}
const lines = (out) => (out === null ? null : out.split("\n").map((l) => l.trim()).filter((l) => l !== ""));
export function gitProbe(run) {
    let resolved;
    // The branch is looked up once for every question the brief asks.
    const ref = () => (resolved ??= (async () => {
        for (const branch of BRANCHES)
            if ((await run(["rev-parse", "--verify", "--quiet", `${branch}^{commit}`])) !== null)
                return branch;
        return null;
    })());
    return {
        ref,
        async named(issue, since) {
            if (!Number.isSafeInteger(issue) || issue <= 0 || !DATE.test(since))
                return null;
            const branch = await ref();
            if (branch === null)
                return null;
            // The number must not be followed by another digit, or an issue would match every longer number that starts
            // with it, and must not follow a word character, as in a mention read anywhere else in the brief.
            return lines(await run(["log", branch, "-E", `--grep=(^|[^[:alnum:]_])#${issue}([^0-9]|$)`, `--since=${since}`, "--format=%h %s", "-n", LIMIT]));
        },
        async touched(files, since) {
            if (!DATE.test(since) || files.length === 0 || !files.every(isSafePath))
                return null;
            const branch = await ref();
            if (branch === null)
                return null;
            return lines(await run([LITERAL, "log", branch, `--since=${since}`, "--format=%h %s", "-n", LIMIT, "--", ...files]));
        },
    };
}
/** Whether git tracks anything under `relative` (a path inside the repository); null when git cannot say. */
export async function tracksAnything(run, relative) {
    if (!isSafePath(relative))
        return null;
    const out = await run([LITERAL, "ls-files", "--", relative]);
    return out === null ? null : out.trim() !== "";
}
//# sourceMappingURL=git-probe.js.map