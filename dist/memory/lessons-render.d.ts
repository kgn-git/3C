import { type Derived } from "./lessons.js";
import type { LessonsTrust } from "./lessons-trust.js";
export declare const ABSENT_LINES: ReadonlyArray<string>;
export declare const EMPTY_LINES: ReadonlyArray<string>;
export declare const refusedLines: (where: string, why: string) => string[];
export interface RenderContext {
    readonly trust: LessonsTrust;
    /** When the memory was built, from its header. */
    readonly syncedAt: string;
    readonly now: Date;
    /** Why the merge dates may be wrong, or null when they are as fresh as a fetch can make them. */
    readonly caveat: string | null;
}
/** The figures, the exclusions beside them, where the file stands in git, and the matches of the last week. */
export declare function renderLessons(derived: Extract<Derived, {
    kind: "ok";
}>, ctx: RenderContext): string[];
//# sourceMappingURL=lessons-render.d.ts.map