import { defaultSourceDeps } from "../../handovers/delivery-source.js";
import { ISSUE_CAP } from "../../handovers/handover-unreadable.js";
import { readStore } from "../../memory/store.js";
import { CAUSE } from "../../memory/causes.js";
import { RETRY_VERB, syncMemory } from "../../memory/sync.js";
import { scanSecrets } from "../../validate/secrets.js";
import { briefCommand } from "./memory-brief.js";
import { lessonsRelPath } from "../../memory/lessons-file.js";
import { lessonsCommand } from "./memory-lessons.js";
import { promptCommand } from "./memory-prompt.js";
import { parseIssueWord } from "../../memory/prompts.js";
/** The first line of a sync that stopped before it finished. */
export const SYNC_STOPPED = "Memory not synced: the sync stopped before it finished.";
const UNREAD = "Your previous memory could not be read and has been left as it was.";
// An error's message can hold a path, and a name or code from another module could hold a line break or a credential, so only a plain identifier that matches no secret pattern is echoed.
const PLAIN_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
function plainField(thrown, field) {
    try {
        const value = typeof thrown === "object" && thrown !== null ? thrown[field] : undefined;
        return typeof value === "string" && PLAIN_IDENTIFIER.test(value) && scanSecrets(value).hits.length === 0 ? value : "unknown";
    }
    catch {
        return "unknown";
    }
}
/** The lines printed when a sync stops: what happened, which error, what to do next. It never throws, because it runs inside a catch. */
export function stoppedLines(thrown, kept) {
    return [
        kept === undefined ? SYNC_STOPPED : `${SYNC_STOPPED} ${kept}`,
        `The error was ${plainField(thrown, "name")} (code ${plainField(thrown, "code")}).`,
        `Next step: check that you can write to this folder, then run ${RETRY_VERB}. If it fails again, report it with \`3c bug\`.`,
    ];
}
const USAGE = `Usage: ${RETRY_VERB}\n  Builds the delivery memory from this repository's trusted handover issues.\n       3c memory brief <issue>\n  Says what is decided and to do for an issue, what earlier work says, and whether it is still current.\n       3c memory brief <issue> --prompt\n  Prints the prompt that starts the work on an issue, from the memory and the issue number only; it does not read the issue on GitHub.\n       3c memory lessons\n  Counts the lessons in ${lessonsRelPath()} across the memory, with their exclusions and the matches of the last week.`;
const NEXT = {
    offline: `check your network connection, then run ${RETRY_VERB}.`,
    unauthenticated: `sign in with \`gh auth login\`, then run ${RETRY_VERB}.`,
    "rate-limited": `wait for GitHub's rate limit to reset, then run ${RETRY_VERB}.`,
    "not-found": `run ${RETRY_VERB} inside a copy of a GitHub repository you can read.`,
    "gh-missing": `install the GitHub CLI from https://cli.github.com, sign in with \`gh auth login\`, then run ${RETRY_VERB}.`,
};
const timer = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const number = (n) => n.toLocaleString("en-GB");
const plural = (n, one, many) => `${number(n)} ${n === 1 ? one : many}`;
function leftOut(s) {
    const left = [];
    const r = s.refused;
    if (r.secret > 0)
        left.push(`${plural(r.secret, "note", "notes")} matching a secret or address pattern (${r.secretTypes.join(", ")})`);
    if (r.control > 0)
        left.push(`${plural(r.control, "note", "notes")} with a control, invisible or unusual space character`);
    if (r.long > 0)
        left.push(`${plural(r.long, "note", "notes")} over the length limit`);
    if (r.wrapped > 0)
        left.push(`${plural(r.wrapped, "note", "notes")} wrapped over too many lines`);
    if (r.fenced > 0)
        left.push(plural(r.fenced, "code block", "code blocks"));
    if (r.unclosed > 0)
        left.push(`${plural(r.unclosed, "line", "lines")} after a code block that never closes`);
    if (s.unreadable > 0)
        left.push(`${plural(s.unreadable, "handover", "handovers")} with no readable delivery block`);
    if (s.superseded > 0)
        left.push(`${plural(s.superseded, "handover", "handovers")} replaced by a newer one for the same pull request`);
    if (s.excluded > 0)
        left.push(`${plural(s.excluded, "handover", "handovers")} from authors who are not owners or members`);
    if (s.overBudget > 0)
        left.push(`${plural(s.overBudget, "note", "notes")} not screened because this sync reached its limit of text to screen`);
    if (s.capped)
        left.push(`handovers older than the newest ${number(ISSUE_CAP)}, which are not read`);
    return left;
}
function summaryLines(s) {
    const lines = [`Memory synced from ${s.repo}: ${plural(s.handovers, "handover", "handovers")}, ${plural(s.notes, "note", "notes")}.`];
    const left = leftOut(s);
    if (left.length > 0)
        lines.push(`Left out: ${left.join("; ")}.`);
    if (s.unlisted !== undefined)
        lines.push(`Handover #${s.unlisted} is not in the memory yet because GitHub had not shown it. This blocks nothing; run ${RETRY_VERB} again in a minute.`);
    return lines;
}
function refusal(result) {
    if (result.reason === "fetch")
        return { what: CAUSE[result.failure], next: NEXT[result.failure] };
    // Exact bytes, because a rounded figure prints the same number for a store one byte over the limit.
    const unit = result.cap === "notes" ? (n) => plural(n, "note", "notes") : (n) => plural(n, "byte", "bytes");
    return {
        what: `it would hold ${unit(result.count)}, and the limit is ${unit(result.limit)}`,
        next: "the limit is part of 3C, so nothing in this folder clears it; report it with `3c bug` so it can be reviewed.",
    };
}
/** `3c memory sync`: rebuilds the memory; exits 1 with the cause and what to do next when it cannot. */
export async function memoryCommand(argv, env) {
    const log = env.log ?? ((m) => console.log(m));
    const error = env.error ?? ((m) => console.error(m));
    const asked = argv[0] === "brief" && (argv.length === 2 || (argv.length === 3 && argv[2] === "--prompt")) ? parseIssueWord(argv[1]) : null;
    if (asked !== null) {
        const common = { cwd: env.cwd, ...(env.limits ? { limits: env.limits } : {}), ...(env.git ? { git: env.git } : {}), log, error };
        return argv.length === 3 ? promptCommand(asked, common) : briefCommand(asked, { ...common, ...(env.deps ? { deps: env.deps } : {}) });
    }
    if (argv.length === 1 && argv[0] === "lessons") {
        return lessonsCommand({ cwd: env.cwd, ...(env.deps ? { deps: env.deps } : {}), ...(env.limits ? { limits: env.limits } : {}), ...(env.git ? { git: env.git } : {}), log, error });
    }
    if (argv.length !== 1 || argv[0] !== "sync") {
        error(USAGE);
        return 2;
    }
    let kept = UNREAD;
    let result;
    try {
        const before = (await readStore(env.cwd, env.limits)).kind;
        kept = before === "found" ? "Your previous memory is unchanged." : before === "absent" ? "There is no memory yet." : UNREAD;
        const expecting = env.filed === undefined ? undefined : { number: env.filed, wait: env.wait ?? timer };
        result = await syncMemory(env.cwd, env.deps ?? defaultSourceDeps, env.limits, env.runBudget, expecting);
    }
    catch (thrown) {
        for (const line of stoppedLines(thrown, kept))
            error(line);
        return 1;
    }
    if (result.ok) {
        for (const line of summaryLines(result.summary))
            log(line);
        return 0;
    }
    const { what, next } = refusal(result);
    error(`Memory not synced: ${what}. ${kept}`);
    error(`Next step: ${next}`);
    return 1;
}
//# sourceMappingURL=memory.js.map