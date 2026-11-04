// Labels for notes the brief prints with more confidence than it has. Each label is a fixed sentence: it holds no
// text taken from a note, and it changes nothing about which notes are shown or which issues are trusted.
import { issueRefs } from "./brief-text.js";
export const OWN_STATEMENT = "Author's own statement, not checked: advice, blocks nothing.";
export const settledLabel = (handover) => `Settled since handover #${handover}: advice, blocks nothing.`;
// Anyone who can edit a handover can type this on any line, so it only says who the author claims to be.
const SOURCE_MARKER = /\(source: (?:owner|agent(?:, unconfirmed)?)\)$/;
export function deliveryIndexOf(delivered) {
    const index = new Map();
    for (const item of delivered) {
        for (const n of item.issues) {
            const at = index.get(n);
            if (at === undefined)
                index.set(n, new Set([item.handover]));
            else
                at.add(item.handover);
        }
    }
    return new Map([...index].map(([n, at]) => [n, [...at].sort((a, b) => a - b)]));
}
/** The first handover after `handover` that delivered `issue`, or null when none did. */
export const deliveredAfter = (index, issue, handover) => index.get(issue)?.find((h) => h > handover) ?? null;
/**
 * The handover that settled a follow-up or open note: the latest first delivery, after the note's own handover, of
 * every issue the note names other than the ones its own handover delivered. Delivery is read from the structured
 * `issues` of a note, never from its text, which anyone can write. Null when any named issue is still undelivered.
 */
function settledBy(note, deliveries) {
    if (note.kind !== "follow-up" && note.kind !== "open")
        return null;
    // The issues its own handover delivered are what it reports as done, so naming them leaves nothing open.
    const named = issueRefs(note.text).filter((n) => !note.issues.includes(n));
    if (named.length === 0)
        return null;
    let settled = 0;
    for (const n of named) {
        const at = deliveredAfter(deliveries, n, note.handover);
        if (at === null)
            return null;
        settled = Math.max(settled, at);
    }
    return settled;
}
/** The labels a note is printed with, in a fixed order. */
export function labelsFor(note, deliveries) {
    const labels = [];
    const settled = settledBy(note, deliveries);
    if (settled !== null)
        labels.push(settledLabel(settled));
    if (SOURCE_MARKER.test(note.text))
        labels.push(OWN_STATEMENT);
    return labels;
}
//# sourceMappingURL=brief-labels.js.map