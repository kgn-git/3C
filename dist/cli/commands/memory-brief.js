import { defaultSourceDeps } from "../../handovers/delivery-source.js";
import { fetchIssue } from "../../handovers/briefed-issue.js";
import { buildBrief } from "../../memory/brief.js";
import { NO_STORE_LINE, renderBrief } from "../../memory/brief-render.js";
import { CAUSE } from "../../memory/causes.js";
import { gitIn, gitProbe } from "../../memory/git-probe.js";
import { readUsableStore, refusalLines } from "../../memory/store-gate.js";
/** `3c memory brief <issue>`: what is decided, what to do and what earlier work says, with whether it is still current. */
export async function briefCommand(issue, env) {
    const run = env.git ?? gitIn(env.cwd);
    const used = await readUsableStore(env.cwd, run, env.limits);
    if (used.kind === "absent") {
        env.log(NO_STORE_LINE);
        return 0;
    }
    if (used.kind === "refused") {
        for (const line of refusalLines("Memory brief", used.refusal))
            env.error(line);
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
    env.log(renderBrief(await buildBrief({ issue, store: used.store, live, unreadCause, git: gitProbe(run) })));
    return 0;
}
//# sourceMappingURL=memory-brief.js.map