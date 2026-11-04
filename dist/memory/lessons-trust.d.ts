import type { GitRun } from "./git-probe.js";
export type LessonsTrust = {
    readonly kind: "clean";
    readonly commit: string;
} | {
    readonly kind: "changed";
    readonly commit: string | null;
} | {
    readonly kind: "not-committed";
} | {
    readonly kind: "unknown";
};
/** The standing of the lessons file in git: its last commit, uncommitted changes, never committed, or unknown. */
export declare function lessonsTrust(run: GitRun): Promise<LessonsTrust>;
//# sourceMappingURL=lessons-trust.d.ts.map