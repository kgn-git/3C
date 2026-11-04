import { issueRefs } from "../../memory/brief-text.js";
import { isIssueNumber } from "../../memory/prompts.js";
import { waitingFollowUps } from "./follow-ups.js";
const DAY_MS = 86_400_000;
const oldestFirst = (a, b) => (b.days ?? -1) - (a.days ?? -1) || a.issue - b.issue;
function ageOf(merged, now) {
    const at = merged === undefined ? NaN : Date.parse(merged);
    return Number.isNaN(at) || at > now.getTime() ? null : Math.floor((now.getTime() - at) / DAY_MS);
}
/** Entries from issue numbers and the time of the oldest handover that named each, split by what the flags say. */
function sorted(named, flags, now) {
    const state = new Map(flags.list.map((f) => [f.issue, f.open]));
    const entries = [];
    let closed = 0;
    for (const [issue, at] of named) {
        const open = state.get(issue);
        if (open === false)
            closed++;
        else
            entries.push({ issue, days: ageOf(at, now), state: open === true ? "open" : "not-checked" });
    }
    return { entries: entries.sort(oldestFirst), closed };
}
const older = (a, b) => {
    if (a === undefined || Number.isNaN(Date.parse(a)))
        return b;
    if (b === undefined || Number.isNaN(Date.parse(b)))
        return a;
    return Date.parse(a) <= Date.parse(b) ? a : b;
};
export function decisionsWaiting(input) {
    const named = new Map();
    let noIssue = 0;
    for (const n of input.notes) {
        const issues = issueRefs(n.text).filter(isIssueNumber);
        if (issues.length === 0)
            noIssue++;
        for (const issue of issues)
            named.set(issue, named.has(issue) ? older(named.get(issue), input.merged.get(n.handover)) : input.merged.get(n.handover));
    }
    if (input.flags === null)
        return { kind: "unchecked", named: named.size, noIssue };
    return { kind: "checked", ...sorted(named, input.flags, input.now), noIssue };
}
export function riskCarried(input) {
    const waiting = waitingFollowUps({ records: input.records, flags: input.flags }, Infinity);
    if (input.flags === null)
        return { kind: "unchecked", named: waiting.rows.length, noIssue: 0 };
    const listed = new Set(waiting.rows.map((r) => r.issue));
    const named = new Map();
    for (const r of input.records) {
        for (const issue of r.follow_ups)
            if (listed.has(issue))
                named.set(issue, named.has(issue) ? older(named.get(issue), r.merged) : r.merged);
    }
    return { kind: "checked", ...sorted(named, input.flags, input.now), closed: waiting.closed, noIssue: 0 };
}
//# sourceMappingURL=manager-waiting.js.map