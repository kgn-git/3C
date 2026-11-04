// What the lessons file says about the stored notes, worked out each time it is asked for. Nothing here is stored or
// written: a figure is a function of the notes, the merge dates and the clock it is given, so editing a note moves it.
import { terms } from "./brief-rank.js";
/** A rule that matches more handovers than this is too broad to be a lesson. */
export const MAX_MATCHES = 100;
export const WEEK_DAYS = 7;
export const WEEK_MS = WEEK_DAYS * 86_400_000;
const timeOf = (iso) => Date.parse(iso);
function tokensByHandover(notes) {
    const out = new Map();
    for (const note of notes) {
        const own = out.get(note.handover) ?? [];
        out.set(note.handover, own);
        if (note.kind !== "change")
            own.push(new Set(terms(note.text)));
    }
    return out;
}
function figuresFor(lesson, raw, held, merged) {
    const excluded = new Set(lesson.exclusions.map((e) => e.handover));
    const rawSet = new Set(raw);
    const matches = raw.filter((h) => !excluded.has(h));
    const dated = matches.flatMap((h) => {
        const at = merged.get(h);
        return at === undefined || Number.isNaN(timeOf(at)) ? [] : [at];
    });
    dated.sort((a, b) => timeOf(a) - timeOf(b));
    return {
        lesson,
        matches,
        first: dated[0] ?? null,
        last: dated.at(-1) ?? null,
        undated: matches.length - dated.length,
        exclusions: lesson.exclusions.map((e) => ({ ...e, status: rawSet.has(e.handover) ? "removed" : held.has(e.handover) ? "matched-nothing" : "not-in-memory" })),
    };
}
/** The figures for every lesson and the matches merged in the week up to `now`, or the lesson that is too broad. */
export function deriveLessons(input) {
    const byHandover = tokensByHandover(input.notes);
    const held = new Set(byHandover.keys());
    const lessons = [];
    for (const [i, lesson] of input.lessons.entries()) {
        const raw = [...byHandover]
            .filter(([, notes]) => notes.some((tokens) => lesson.terms.every((t) => tokens.has(t))))
            .map(([handover]) => handover)
            .sort((a, b) => a - b);
        if (raw.length > MAX_MATCHES)
            return { kind: "refused", where: `lesson ${i + 1}, terms`, why: `match more than ${MAX_MATCHES} handovers, so they are too broad` };
        lessons.push(figuresFor(lesson, raw, held, input.merged));
    }
    const now = input.now.getTime();
    const weekly = lessons.flatMap((f) => f.matches.flatMap((handover) => {
        const merged = input.merged.get(handover);
        const at = merged === undefined ? NaN : timeOf(merged);
        return merged !== undefined && at <= now && now - at <= WEEK_MS ? [{ lesson: f.lesson.id, handover, merged }] : [];
    }));
    return { kind: "ok", lessons, weekly };
}
//# sourceMappingURL=lessons.js.map