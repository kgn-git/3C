import { parseHandoverBody } from "./handover.js";
export const ISSUE_CAP = 500;
const PAGE = 100;
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
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
const newestFirst = (a, b) => {
    const ta = a.merged === undefined ? -Infinity : Date.parse(a.merged);
    const tb = b.merged === undefined ? -Infinity : Date.parse(b.merged);
    return tb - ta || b.handover - a.handover;
};
export async function fetchHandoverIssues(repo, gh) {
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
        if (got.items.length + got.bad < PAGE)
            break;
    }
    const capped = issues.length > ISSUE_CAP;
    const parsed = [];
    let legacy = 0;
    let malformed = bad;
    let excluded = 0;
    for (const item of issues.slice(0, ISSUE_CAP)) {
        if (!TRUSTED.has(item.association)) {
            excluded++;
            continue;
        }
        const p = parseHandoverBody(item.number, item.body);
        if (p.kind === "record")
            parsed.push(p.record);
        else if (p.kind === "legacy")
            legacy++;
        else
            malformed++;
    }
    // Newest first, each delivered issue goes to the first record that claims
    // it; an older record keeps whatever issues are still unclaimed.
    const claimed = new Set();
    const records = [];
    let conflicts = 0;
    for (const r of parsed.sort(newestFirst)) {
        const free = r.issues.filter((i) => !claimed.has(i));
        if (free.length < r.issues.length)
            conflicts++;
        if (free.length === 0)
            continue;
        for (const i of free)
            claimed.add(i);
        records.push(free.length === r.issues.length ? r : { ...r, issues: free });
    }
    return { ok: true, scan: { records, legacy, malformed, excluded, conflicts, capped } };
}
//# sourceMappingURL=handover-issues.js.map