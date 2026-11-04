import { CALL_MS, DEADLINE_MS } from "./handover-issues.js";
export const FLAG_CAP = 300;
export const FLAG_BATCH = 10;
// The answer is one word.
const MAX_BUFFER = 256;
// A pull request has an issue number too, and is not an issue to count.
const JQ = 'if .pull_request then "pull" else .state end';
async function readOne(repo, issue, gh, timeoutMs) {
    const out = await gh(["api", "-X", "GET", `repos/${repo}/issues/${issue}`, "--jq", JQ], { timeoutMs, maxBuffer: MAX_BUFFER });
    // GitHub does not answer for this number as an issue here, so it is unknown; the handover list was read a moment ago, so the repository is there.
    if (!out.ok)
        return out.failure === "not-found" ? { ok: true, open: null } : out;
    const word = out.stdout.trim();
    if (word === "open" || word === "closed")
        return { ok: true, open: word === "open" };
    if (word === "pull")
        return { ok: true, open: null };
    return { ok: false, failure: "offline", detail: "gh returned an issue state that is not open or closed" };
}
/** The flag of each distinct valid number in the order given, up to FLAG_CAP; one failed call fails the whole read. */
export async function fetchIssueFlags(repo, numbers, gh, deadline = Date.now() + DEADLINE_MS) {
    const distinct = [...new Set(numbers.filter((n) => Number.isSafeInteger(n) && n > 0))];
    const wanted = distinct.slice(0, FLAG_CAP);
    const flags = [];
    for (let at = 0; at < wanted.length; at += FLAG_BATCH) {
        const left = deadline - Date.now();
        if (left <= 0)
            return { ok: false, failure: "offline", detail: `reading issue states exceeded ${DEADLINE_MS} ms` };
        const batch = wanted.slice(at, at + FLAG_BATCH);
        const got = await Promise.all(batch.map((n) => readOne(repo, n, gh, Math.min(CALL_MS, left))));
        for (const [i, one] of got.entries()) {
            if (!one.ok)
                return one;
            flags.push({ issue: batch[i], open: one.open });
        }
    }
    return { ok: true, flags, cut: distinct.length - wanted.length };
}
//# sourceMappingURL=issue-flags.js.map