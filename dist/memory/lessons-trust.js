import { lessonsRelPath } from "./lessons-file.js";
const COMMIT = /^[0-9a-f]{4,40}$/;
/** The standing of the lessons file in git: its last commit, uncommitted changes, never committed, or unknown. */
export async function lessonsTrust(run) {
    const file = lessonsRelPath();
    // `status` would otherwise refresh the index, which writes inside .git and waits on another git's lock.
    const ask = (verb) => run(["--no-optional-locks", "--literal-pathspecs", ...verb, "--", file]);
    const tracked = await ask(["ls-files"]);
    if (tracked === null)
        return { kind: "unknown" };
    if (tracked.trim() === "")
        return { kind: "not-committed" };
    const status = await ask(["status", "--porcelain"]);
    if (status === null)
        return { kind: "unknown" };
    // A file that is staged and never committed has no commit yet, which git prints as nothing.
    const commit = (await ask(["log", "-1", "--format=%h"]))?.trim() || null;
    if (commit !== null && !COMMIT.test(commit))
        return { kind: "unknown" };
    if (status.trim() !== "")
        return { kind: "changed", commit };
    return commit === null ? { kind: "unknown" } : { kind: "clean", commit };
}
//# sourceMappingURL=lessons-trust.js.map