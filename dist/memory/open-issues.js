// The issue numbers the delivery cache reads the state of on the memory's behalf. The cache module sits below the
// memory and cannot import it, so this layer supplies the list and every refresh path takes it from `memoryDeps`.
import { defaultSourceDeps } from "../handovers/delivery-source.js";
import { issueRefs } from "./brief-text.js";
import { readStore } from "./store.js";
/** The numbers named on `open` notes ("needs a human"), newest handover first, each once; none when the memory is missing or refused. */
export async function openNoteIssues(ws) {
    const read = await readStore(ws);
    if (read.kind !== "found")
        return [];
    const open = read.store.notes.filter((n) => n.kind === "open").sort((a, b) => b.handover - a.handover);
    return [...new Set(open.flatMap((n) => issueRefs(n.text)))];
}
export const memoryDeps = { ...defaultSourceDeps, extraIssues: openNoteIssues };
//# sourceMappingURL=open-issues.js.map