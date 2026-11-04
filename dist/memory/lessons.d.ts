import type { Exclusion, Lesson } from "./lessons-file.js";
import type { Note } from "./notes.js";
/** A rule that matches more handovers than this is too broad to be a lesson. */
export declare const MAX_MATCHES = 100;
export declare const WEEK_DAYS = 7;
export declare const WEEK_MS: number;
export interface LessonInputs {
    readonly lessons: ReadonlyArray<Lesson>;
    readonly notes: ReadonlyArray<Note>;
    /** Handover number to its `merged` time, for the handovers the delivery cache holds a time for. */
    readonly merged: ReadonlyMap<number, string>;
    readonly now: Date;
}
export interface ExclusionOutcome extends Exclusion {
    /** It took a match out, it named a handover the rule does not match, or the memory holds no note of that handover. */
    readonly status: "removed" | "matched-nothing" | "not-in-memory";
}
export interface LessonFigures {
    readonly lesson: Lesson;
    /** Handovers that match and are not excluded, ascending. */
    readonly matches: ReadonlyArray<number>;
    readonly first: string | null;
    readonly last: string | null;
    /** Matches with no merge time, which are in no date figure. */
    readonly undated: number;
    readonly exclusions: ReadonlyArray<ExclusionOutcome>;
}
export interface WeeklyMatch {
    readonly lesson: string;
    readonly handover: number;
    readonly merged: string;
}
export type Derived = {
    readonly kind: "ok";
    readonly lessons: ReadonlyArray<LessonFigures>;
    readonly weekly: ReadonlyArray<WeeklyMatch>;
} | {
    readonly kind: "refused";
    readonly where: string;
    readonly why: string;
};
/** The figures for every lesson and the matches merged in the week up to `now`, or the lesson that is too broad. */
export declare function deriveLessons(input: LessonInputs): Derived;
//# sourceMappingURL=lessons.d.ts.map