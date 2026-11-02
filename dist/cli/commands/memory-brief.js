import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { defaultSourceDeps } from "../../handovers/delivery-source.js";
import { fetchIssue } from "../../handovers/briefed-issue.js";
import { buildBrief } from "../../memory/brief.js";
import { NO_STORE_LINE, renderBrief } from "../../memory/brief-render.js";
import { CAUSE } from "../../memory/causes.js";
import { gitIn, gitProbe, tracksAnything } from "../../memory/git-probe.js";
import { memoryDir, readStore } from "../../memory/store.js";
/** Why the memory folder cannot be taken as written by 3c memory sync, or null when it can. A tracked folder may have come from a commit. */
async function untrustedStore(ws, run) {
    const dir = memoryDir(ws);
    const tracked = await tracksAnything(run, relative(ws, dir).replace(/\\/g, "/"));
    if (tracked === null)
        return "version control could not say whether the memory folder is kept in it";
    if (tracked)
        return "the memory folder is kept in version control, so it may have come from a commit and not from 3c memory sync";
    let ignore;
    try {
        ignore = await readFile(join(dir, ".gitignore"), "utf8");
    }
    catch {
        return "the memory folder has no ignore file of its own";
    }
    return ignore.trim() === "*" ? null : "the memory folder's ignore file is not the one 3c memory sync writes";
}
/** `3c memory brief <issue>`: what is decided, what to do and what earlier work says, with whether it is still current. */
export async function briefCommand(issue, env) {
    const read = await readStore(env.cwd, env.limits);
    if (read.kind === "absent") {
        env.log(NO_STORE_LINE);
        return 0;
    }
    const run = env.git ?? gitIn(env.cwd);
    const why = read.kind === "refused" ? read.reason : await untrustedStore(env.cwd, run);
    if (read.kind === "refused" || why !== null) {
        const folder = relative(env.cwd, memoryDir(env.cwd));
        env.error(`Memory brief: the memory was not used, because ${why}.`);
        env.error(`Next step: delete the ${folder} folder, then run 3c memory sync to build it again.`);
        return 1;
    }
    const deps = env.deps ?? defaultSourceDeps;
    const repo = await deps.repo(env.cwd);
    let live = null;
    let unreadCause = CAUSE["not-found"];
    if (repo !== null) {
        const got = await fetchIssue(repo, issue, deps.gh);
        if (got.ok) {
            live = got.issue;
            unreadCause = null;
        }
        else if (got.failure === "too-large") {
            env.error(`Memory brief: issue #${issue} is longer than the brief reads.`);
            env.error("Next step: ask its owner to keep the decision in a shorter section, then run the brief again.");
            return 1;
        }
        else if (got.failure === "not-found") {
            env.error(got.detail.includes("pull request")
                ? `Memory brief: #${issue} is a pull request, not an issue.`
                : `Memory brief: issue #${issue} was not found in ${repo}, or you cannot read it.`);
            env.error("Next step: check the number, then run the brief again.");
            return 1;
        }
        else
            unreadCause = CAUSE[got.failure];
    }
    env.log(renderBrief(await buildBrief({ issue, store: read.store, live, unreadCause, git: gitProbe(run) })));
    return 0;
}
//# sourceMappingURL=memory-brief.js.map