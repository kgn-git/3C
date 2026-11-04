// The follow-ups that are still waiting, worked out from the handover records and the open or closed flags the delivery
// cache holds. A follow-up is waiting when the newest handover listing it is not followed by a handover that delivered
// it, and, where the flags say so, it is not closed. "Delivered after" is the test the brief's settled label uses
// (deliveredAfter); the brief applies it to the issues a note names, this view to each follow-up a record lists.
import { deliveredAfter, deliveryIndexOf } from "../../memory/brief-labels.js";
import { isIssueNumber } from "../../memory/prompts.js";
export const FOLLOW_UP_CAP = 10;
export function waitingFollowUps(input, cap = FOLLOW_UP_CAP) {
    const delivered = deliveryIndexOf(input.records);
    const state = new Map((input.flags?.list ?? []).map((f) => [f.issue, f.open]));
    const seen = new Set();
    const waiting = [];
    let closed = 0;
    for (const record of [...input.records].sort((a, b) => b.handover - a.handover)) {
        for (const issue of record.follow_ups) {
            // A number no prompt or gh command can carry is left out, so one odd value cannot stop the page.
            if (seen.has(issue) || !isIssueNumber(issue))
                continue;
            seen.add(issue);
            if (record.issues.includes(issue) || deliveredAfter(delivered, issue, record.handover) !== null)
                continue;
            const open = state.get(issue);
            if (open === false)
                closed += 1;
            else
                waiting.push({ issue, named: record.handover, state: open === true ? "open" : "not-checked" });
        }
    }
    return { rows: waiting.slice(0, cap), more: Math.max(0, waiting.length - cap), closed };
}
//# sourceMappingURL=follow-ups.js.map