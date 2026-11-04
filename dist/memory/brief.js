// Builds a brief: what an issue says is decided and to do, which stored notes bear on it, and whether it is
// still current. The issue's own text feeds the brief only when GitHub says a trusted author wrote it.
import { isTrustedAuthor } from "../handovers/handover-issues.js";
import { extractCriteria, extractDecided, extractFiles, issueRefs, rulingDate } from "./brief-text.js";
import { deliveryIndexOf, labelsFor } from "./brief-labels.js";
import { rankNotes } from "./brief-rank.js";
const MAX_EVIDENCE = 3;
const NO_FILES = "The issue names no files, so only merged changes that name it were checked.";
async function checkFreshness(live, decided, files, git, issue) {
    if (live === null)
        return { verdict: "unknown", evidence: ["The issue could not be read just now."], evidenceFrom: "GitHub", since: null, sinceFrom: null };
    const ruled = decided.map(rulingDate).find((d) => d !== null) ?? null;
    const since = ruled ?? live.updated_at.slice(0, 10);
    const sinceFrom = ruled === null ? "update" : "ruling";
    if (live.state === "closed")
        return { verdict: "closed", evidence: ["The issue is closed."], evidenceFrom: "GitHub", since, sinceFrom };
    const named = await git.named(issue, since);
    if (named !== null && named.length > 0)
        return { verdict: "named", evidence: named.slice(0, MAX_EVIDENCE), evidenceFrom: "git", since, sinceFrom };
    const touched = files.length === 0 ? [] : await git.touched(files, since);
    if (touched !== null && touched.length > 0)
        return { verdict: "files-moved", evidence: touched.slice(0, MAX_EVIDENCE), evidenceFrom: "git", since, sinceFrom };
    if (named === null || touched === null)
        return { verdict: "unknown", evidence: ["Git could not say what changed on the default branch."], evidenceFrom: "git", since, sinceFrom };
    return { verdict: "unchanged", evidence: files.length === 0 ? [NO_FILES] : [], evidenceFrom: "git", since, sinceFrom };
}
export async function buildBrief(input) {
    const { issue, store, live, git } = input;
    const source = live === null ? "unread" : isTrustedAuthor(live.author_association) ? "trusted" : "untrusted";
    const body = source === "trusted" ? live.body : "";
    const decided = extractDecided(body);
    const criteria = extractCriteria(body);
    // An untrusted or unread issue names no files and supplies no words: only a note's link to its number counts.
    const issueFiles = extractFiles(body);
    const query = source === "trusted" ? `${live.title} ${body}` : "";
    const refs = source === "trusted" ? issueRefs(body).filter((r) => r !== issue) : [];
    const deliveries = deliveryIndexOf(store.notes);
    const notes = rankNotes(store.notes, issue, query, issueFiles, refs).map((ranked) => ({ ...ranked, labels: labelsFor(ranked.note, deliveries) }));
    const touch = extractFiles(body, ...notes.map((n) => n.note.text));
    const fresh = await checkFreshness(live, decided, issueFiles, git, issue);
    return {
        issue,
        // The title is the author's words as much as the body is, so it is withheld in the same cases.
        title: source === "trusted" ? live.title : null,
        source,
        unreadCause: source === "unread" ? (input.unreadCause ?? null) : null,
        ref: await git.ref(),
        decided,
        criteria,
        touch,
        notes,
        syncedAt: store.meta.syncedAt,
        ...fresh,
    };
}
//# sourceMappingURL=brief.js.map