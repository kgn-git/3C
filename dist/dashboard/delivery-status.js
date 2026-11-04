import { failureRoute } from "../handovers/failure-routes.js";
import { ISSUE_CAP } from "../handovers/handover-unreadable.js";
/** How many unreadable handovers the console, page and panel print before counting the rest. */
export const UNREADABLE_SHOWN = 50;
/** How many handovers with an undefined key the one note line names; each can name up to MAX_NOTED_KEYS keys. */
export const NOTED_SHOWN = 10;
const EDIT_ISSUE = "gh issue edit <number> --web";
const RETRY = "3c dashboard";
const FETCH = failureRoute("never-fetched", RETRY);
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// The fix for each kind lives here so the three surfaces cannot word it differently.
function unreadableLine(u) {
    if (u.issue === null)
        return "A handover entry had no issue number, so it could not be read. Nothing in 3C can fix it.";
    if (u.kind === "legacy")
        return `#${u.issue}: ${u.reason}. It blocks nothing; leave it, or add a delivery block to count it.`;
    return `#${u.issue}: ${u.reason}. Fix the delivery block so it matches 3c-handover/1: ${EDIT_ISSUE.replace("<number>", String(u.issue))}`;
}
/** The first `shown` entries as lines, then one line counting the rest. */
function firstAndMore(list, shown, line) {
    const lines = list.slice(0, shown).map(line);
    if (list.length > shown)
        lines.push(`and ${list.length - shown} more`);
    return lines;
}
const unreadableLines = (list) => firstAndMore(list, UNREADABLE_SHOWN, unreadableLine);
/** One line for every block read past an undefined key: it names each block and key, and says it blocks nothing. */
function notedLine(noted) {
    if (noted.length === 0)
        return null;
    const named = firstAndMore(noted, NOTED_SHOWN, (n) => `#${n.issue} ${n.keys.join(", ")}`);
    const lead = count(noted.length, "handover has a key its delivery block does not define", "handovers have a key their delivery block does not define");
    return `${lead}; the key is left out and the delivery still counts, so this blocks nothing: ${named.join("; ")}`;
}
function completenessOf(legacy, malformed) {
    if (malformed > 0) {
        const also = legacy > 0 ? ` and ${count(legacy, "more carries", "more carry")} no delivery block` : "";
        return `${count(malformed, "handover", "handovers")} cannot be read${also}, so the numbers above are incomplete.`;
    }
    if (legacy > 0) {
        return legacy === 1
            ? "1 handover carries no delivery block, so it is not in the numbers above."
            : `${legacy} handovers carry no delivery block, so they are not in the numbers above.`;
    }
    return null;
}
export function describeDelivery(src) {
    const header = `Repository: ${src.repo ?? "none (no github.com origin remote)"}`;
    const s = src.status;
    let status;
    let stale = false;
    const nextSteps = [];
    const unread = s.kind === "discarded" || s.kind === "outdated" || (s.kind === "failed" && s.state !== "never-fetched");
    if (s.kind === "fresh")
        status = `Handover issues as of ${s.fetchedAt}`;
    else if (s.kind === "expired")
        status = `Handover issues as of ${s.fetchedAt} (refreshing)`;
    else if (s.kind === "discarded") {
        status = "No handover data: the cache failed validation and was discarded";
        nextSteps.push(FETCH);
    }
    else if (s.kind === "outdated") {
        status = "No handover data: the cache is from an earlier version; refetching";
        nextSteps.push(FETCH);
    }
    else {
        stale = s.fetchedAt !== null;
        status = stale ? `STALE: ${s.state}, cache from ${s.fetchedAt}` : `No handover data: ${s.state}`;
        nextSteps.push(failureRoute(s.state, RETRY));
    }
    const { excluded, capped, conflicts, legacy, malformed, unreadable, noted } = src.scan;
    const notes = [
        excluded > 0
            ? `${count(excluded, "handover issue", "handover issues")} not counted: only owners' and members' handovers count`
            : null,
        capped ? `newest ${ISSUE_CAP} shown; more exist` : null,
        conflicts > 0 ? `${count(conflicts, "older handover", "older handovers")} filed the same pull request as a newer one` : null,
        legacy > 0 ? `${count(legacy, "handover issue carries", "handover issues carry")} no delivery block` : null,
        malformed > 0 ? `${count(malformed, "handover issue has", "handover issues have")} a malformed delivery block` : null,
        notedLine(noted),
    ].filter((n) => n !== null);
    if (unreadable.some((u) => u.kind === "malformed" && u.issue !== null)) {
        nextSteps.push(`${EDIT_ISSUE}   # open an unreadable handover and fix its delivery block (schema: .claude/skills/3c-project-manager/SKILL.md)`);
    }
    if (noted.length > 0)
        nextSteps.push(`${EDIT_ISSUE}   # open a handover named above and correct or remove the key`);
    return { header, status, stale, unread, notes, unreadable: unreadableLines(unreadable), completeness: completenessOf(legacy, malformed), nextSteps };
}
//# sourceMappingURL=delivery-status.js.map