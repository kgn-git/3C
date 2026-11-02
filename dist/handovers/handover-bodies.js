import { fetchHandoverItems, isTrustedAuthor } from "./handover-issues.js";
import { ISSUE_CAP } from "./handover-unreadable.js";
export async function fetchHandoverBodies(repo, gh) {
    const fetched = await fetchHandoverItems(repo, gh);
    if (!fetched.ok)
        return fetched;
    const bodies = [];
    const read = fetched.issues.slice(0, ISSUE_CAP);
    let excluded = 0;
    for (const item of read) {
        if (isTrustedAuthor(item.association))
            bodies.push({ number: item.number, body: item.body });
        else
            excluded++;
    }
    return { ok: true, bodies, listed: fetched.issues.map((item) => item.number), excluded, capped: fetched.issues.length > ISSUE_CAP };
}
//# sourceMappingURL=handover-bodies.js.map