import { parseHandoverBody } from "./handover.js";
import { ISSUE_CAP, LEGACY_REASON, NO_NUMBER_REASON, countUnreadable, } from "./handover-unreadable.js";
export { ISSUE_CAP };
const PAGE = 100;
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
/** Whether GitHub's author_association names an owner, an organisation member or an invited collaborator. */
export const isTrustedAuthor = (association) => TRUSTED.has(association);
// A body is at most 64 KiB; JSON can escape each byte to six, and the rest of
// an issue object adds a few KiB.
const MAX_BUFFER = PAGE * (6 * 65_536 + 16_384);
const CALL_MS = 30_000;
// The whole refresh, every page included, so one refresh cannot hold the
// server's single refresh slot for minutes.
const DEADLINE_MS = 90_000;
/** A page's issues, with items that are not issue-shaped counted rather than trusted; null when the page is not a list. */
function toItems(stdout) {
    let page;
    try {
        page = JSON.parse(stdout);
    }
    catch {
        return null;
    }
    if (!Array.isArray(page))
        return null;
    const items = [];
    let bad = 0;
    for (const raw of page) {
        const o = (typeof raw === "object" && raw !== null ? raw : {});
        const n = o["number"];
        if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) {
            bad++;
            continue;
        }
        const body = o["body"];
        const association = o["author_association"];
        items.push({
            number: n,
            body: typeof body === "string" ? body : "",
            association: typeof association === "string" ? association : "",
            isPull: o["pull_request"] !== undefined && o["pull_request"] !== null,
        });
    }
    return { items, bad };
}
export const newestFirst = (a, b) => {
    const ta = a.merged === undefined ? -Infinity : Date.parse(a.merged);
    const tb = b.merged === undefined ? -Infinity : Date.parse(b.merged);
    return tb - ta || b.handover - a.handover;
};
/** Whole pages of handover issues until the count passes the cap, pull requests removed; the scan and the memory read the same pages. */
export async function fetchHandoverItems(repo, gh) {
    const issues = [];
    let bad = 0;
    const deadline = Date.now() + DEADLINE_MS;
    // One page past the cap answers "do more exist" without a count request.
    // Pull requests come back from this endpoint too and take no cap slot.
    for (let page = 1; issues.length <= ISSUE_CAP; page++) {
        const left = deadline - Date.now();
        if (left <= 0)
            return { ok: false, failure: "offline", detail: `refresh exceeded ${DEADLINE_MS} ms` };
        const out = await gh([
            "api", "-X", "GET", `repos/${repo}/issues`,
            "-f", "labels=handover", "-f", "state=all", "-f", "sort=created", "-f", "direction=desc",
            "-f", `per_page=${PAGE}`, "-f", `page=${page}`,
        ], { timeoutMs: Math.min(CALL_MS, left), maxBuffer: MAX_BUFFER });
        if (!out.ok)
            return out;
        const got = toItems(out.stdout);
        if (got === null)
            return { ok: false, failure: "offline", detail: "gh returned something other than an issue list" };
        issues.push(...got.items.filter((i) => !i.isPull));
        bad += got.bad;
        // Items with no number never reach the cap above, so a feed made only of them would page until the deadline.
        if (bad > ISSUE_CAP)
            return { ok: false, failure: "offline", detail: "gh returned too many items without an issue number" };
        if (got.items.length + got.bad < PAGE)
            break;
    }
    return { ok: true, issues, bad };
}
export async function fetchHandoverIssues(repo, gh) {
    const fetched = await fetchHandoverItems(repo, gh);
    if (!fetched.ok)
        return fetched;
    const { issues, bad } = fetched;
    const capped = issues.length > ISSUE_CAP;
    const parsed = [];
    const unreadable = [];
    let excluded = 0;
    for (const item of issues.slice(0, ISSUE_CAP)) {
        if (!isTrustedAuthor(item.association)) {
            excluded++;
            continue;
        }
        const p = parseHandoverBody(item.number, item.body);
        if (p.kind === "record")
            parsed.push(p.record);
        else if (p.kind === "legacy")
            unreadable.push({ issue: item.number, kind: "legacy", reason: LEGACY_REASON });
        else
            unreadable.push({ issue: item.number, kind: "malformed", reason: p.reason });
    }
    for (let i = 0; i < bad; i++)
        unreadable.push({ issue: null, kind: "malformed", reason: NO_NUMBER_REASON });
    // A delivery is its pull request, or its handover number when none is named.
    // The two spaces are tagged so handover 145 never reads as pull request 145.
    // Two handovers for one pull request are one delivery; the newest is kept.
    const seen = new Set();
    const records = [];
    let conflicts = 0;
    for (const r of parsed.sort(newestFirst)) {
        const key = r.pr === undefined ? `handover:${r.handover}` : `pr:${r.pr}`;
        if (seen.has(key)) {
            conflicts++;
            continue;
        }
        seen.add(key);
        records.push(r);
    }
    return { ok: true, scan: { records, ...countUnreadable(unreadable), unreadable, excluded, conflicts, capped } };
}
//# sourceMappingURL=handover-issues.js.map