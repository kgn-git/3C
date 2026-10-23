import { ISSUE_CAP } from "./handover-issues.js";
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
export function describeDelivery(src) {
    const header = `Repository: ${src.repo ?? "none (no github.com origin remote)"}`;
    const s = src.status;
    let status;
    let stale = false;
    const nextSteps = [];
    const unread = s.kind === "discarded" || (s.kind === "failed" && s.state !== "never-fetched");
    if (s.kind === "fresh")
        status = `Handover issues as of ${s.fetchedAt}`;
    else if (s.kind === "expired")
        status = `Handover issues as of ${s.fetchedAt} (refreshing)`;
    else if (s.kind === "discarded") {
        status = "No handover data: the cache failed validation and was discarded";
        nextSteps.push(FETCH);
    }
    else {
        stale = s.fetchedAt !== null;
        status = stale ? `STALE: ${s.state}, cache from ${s.fetchedAt}` : `No handover data: ${s.state}`;
        nextSteps.push(ROUTE[s.state]);
    }
    const { excluded, capped, conflicts, legacy, malformed } = src.scan;
    const notes = [
        excluded > 0
            ? `${count(excluded, "handover issue", "handover issues")} not counted: only owners', members' and collaborators' handovers count`
            : null,
        capped ? `newest ${ISSUE_CAP} shown; more exist` : null,
        conflicts > 0 ? `${count(conflicts, "older handover", "older handovers")} lost an issue to a newer handover for the same issue` : null,
        legacy > 0 ? `${count(legacy, "handover issue carries", "handover issues carry")} no delivery block` : null,
        malformed > 0 ? `${count(malformed, "handover issue has", "handover issues have")} a malformed delivery block` : null,
    ].filter((n) => n !== null);
    if (malformed > 0) {
        nextSteps.push(`gh issue list --label handover --state all --limit ${ISSUE_CAP} --json number,body   # find the leading yaml block that does not match \`3c-handover/1\` (schema: .claude/skills/3c-project-manager/SKILL.md)`);
    }
    return { header, status, stale, unread, notes, nextSteps };
}
//# sourceMappingURL=delivery-status.js.map