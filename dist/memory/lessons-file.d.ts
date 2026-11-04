export declare const LESSON_LIMITS: {
    readonly bytes: number;
    readonly lessons: 50;
    readonly terms: 8;
    readonly term: 40;
    readonly exclusions: 100;
    readonly title: 100;
    readonly reason: 200;
};
export interface Exclusion {
    readonly handover: number;
    readonly reason: string;
}
export interface Lesson {
    readonly id: string;
    readonly title: string;
    readonly terms: ReadonlyArray<string>;
    readonly exclusions: ReadonlyArray<Exclusion>;
}
export type LessonsRead = {
    readonly kind: "absent";
} | {
    readonly kind: "empty";
} | {
    readonly kind: "refused";
    readonly where: string;
    readonly why: string;
} | {
    readonly kind: "found";
    readonly lessons: ReadonlyArray<Lesson>;
};
/** The file's path from the workspace root, in the form git and a reader of the output know it. */
export declare const lessonsRelPath: () => string;
export declare const lessonsPath: (ws: string) => string;
/** The lessons in the text of a file, or why the whole file is refused. The caller has already bounded the text. */
export declare function parseLessons(text: string): LessonsRead;
/** The lessons file of a workspace: absent, empty, refused with the reason, or found. It only reads. */
export declare function readLessons(ws: string, bytes?: number): Promise<LessonsRead>;
//# sourceMappingURL=lessons-file.d.ts.map