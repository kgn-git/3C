import { ISSUE_CAP } from "./handover-unreadable.js";
/** How many unreadable handovers the console, page and panel print before counting the rest. */
export const UNREADABLE_SHOWN = 50;
const FETCH = "3c dashboard   # fetches the handover issues";
const ROUTE = {
    "never-fetched": FETCH,
    offline: "Check the network connection, then run 3c dashboard   # details: .3c/cache/handover-fetch.log",
    unauthenticated: "gh auth login",
    "rate-limited": "Wait for the GitHub rate limit to reset, then run 3c dashboard",
    "not-found": "git remote get-url origin   # must name a github.com repository you can read (gh repo view)",
    "gh-missing": "Install the GitHub CLI from https://cli.github.com, then run gh auth login",
};
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// The fix for each kind lives here so the three surfaces cannot word it differently.
function unreadableLine(u) {
    if (u.issue === null)
        return "A handover entry had no issue number, so it could not be read. Nothing in 3C can fix it.";
    if (u.kind === "legacy")
        return `#${u.issue}: ${u.reason}. It blocks nothing; leave it, or add a delivery block to count it.`;
    return `#${u.issue}: ${u.reason}. Fix the delivery block so it matches 3c-handover/1: gh issue edit ${u.issue} --web`;
}
function unreadableLines(list) {
    const lines = list.slice(0, UNREADABLE_SHOWN).map(unreadableLine);
    if (list.length > UNREADABLE_SHOWN)
        lines.push(`and ${list.length - UNREADABLE_SHOWN} more`);
    return lines;
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
        nextSteps.push(ROUTE[s.state]);
    }
    const { excluded, capped, conflicts, legacy, malformed, unreadable } = src.scan;
    const notes = [
        excluded > 0
            ? `${count(excluded, "handover issue", "handover issues")} not counted: only owners', members' and collaborators' handovers count`
            : null,
        capped ? `newest ${ISSUE_CAP} shown; more exist` : null,
        conflicts > 0 ? `${count(conflicts, "older handover", "older handovers")} filed the same pull request as a newer one` : null,
        legacy > 0 ? `${count(legacy, "handover issue carries", "handover issues carry")} no delivery block` : null,
        malformed > 0 ? `${count(malformed, "handover issue has", "handover issues have")} a malformed delivery block` : null,
    ].filter((n) => n !== null);
    if (unreadable.some((u) => u.kind === "malformed" && u.issue !== null)) {
        nextSteps.push("gh issue edit <number> --web   # open an unreadable handover and fix its delivery block (schema: .claude/skills/3c-project-manager/SKILL.md)");
    }
    return { header, status, stale, unread, notes, unreadable: unreadableLines(unreadable), completeness: completenessOf(legacy, malformed), nextSteps };
}
//# sourceMappingURL=delivery-status.js.map