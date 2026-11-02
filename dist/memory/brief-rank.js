// Which stored notes bear on an issue: first those that link to it, then those that name a file it touches, then
// those that share its words. A note that only shares common words is left out, so a precedent has to earn its place.
import { issueRefs, mentionsIssue, mentionsPath } from "./brief-text.js";
export const MAX_NOTES = 8;
const STOPWORDS = new Set("about after again also because been before being between both cannot could does done each every from have into just more most must need only other over same should since some such than that their them then there these they this those through under until upon very were what when where which while will with within without would your".split(" "));
// Words alone rank a note only when it shares at least this many distinct meaningful ones with the issue.
const MIN_SHARED = 2;
// An issue body names a handful of related issues and a few hundred distinct words; a longer list is cut so the
// work stays in proportion to the store, not to what an author pasted.
const MAX_REFS = 200;
const MAX_QUERY_TERMS = 500;
const K1 = 1.2;
const B = 0.75;
const terms = (text) => (text.toLowerCase().match(/[a-z0-9][a-z0-9-]{3,}/g) ?? []).filter((t) => !STOPWORDS.has(t));
/** The notes that bear on `issue`, best first, at most MAX_NOTES. `query` and `files` are what the issue says and names. */
export function rankNotes(notes, issue, query, files, refs) {
    const docs = notes.map((n) => terms(n.text));
    const df = new Map();
    for (const d of docs)
        for (const t of new Set(d))
            df.set(t, (df.get(t) ?? 0) + 1);
    const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1) || 1;
    const queryTerms = [...new Set(terms(query))].slice(0, MAX_QUERY_TERMS);
    const related = new Set(refs.slice(0, MAX_REFS));
    const ranked = [];
    for (const [i, note] of notes.entries()) {
        if (note.issues.includes(issue) || mentionsIssue(note.text, issue)) {
            ranked.push({ note, why: "link", score: 1000 });
            continue;
        }
        if (related.size > 0 && (note.issues.some((r) => related.has(r)) || issueRefs(note.text).some((r) => related.has(r)))) {
            ranked.push({ note, why: "related", score: 300 });
            continue;
        }
        if (files.some((f) => mentionsPath(note.text, f))) {
            ranked.push({ note, why: "file", score: 200 });
            continue;
        }
        const doc = docs[i];
        const counts = new Map();
        for (const t of doc)
            counts.set(t, (counts.get(t) ?? 0) + 1);
        let shared = 0;
        let score = 0;
        for (const t of queryTerms) {
            const tf = counts.get(t);
            if (tf === undefined)
                continue;
            shared++;
            const n = df.get(t) ?? 1;
            const idf = Math.log(1 + (notes.length - n + 0.5) / (n + 0.5));
            score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avg));
        }
        if (shared >= MIN_SHARED)
            ranked.push({ note, why: "words", score });
    }
    // Best first; equal scores keep the store's order, which is the order the handovers were read.
    return ranked.map((r, order) => ({ r, order })).sort((a, b) => b.r.score - a.r.score || a.order - b.order).slice(0, MAX_NOTES).map(({ r }) => r);
}
//# sourceMappingURL=brief-rank.js.map