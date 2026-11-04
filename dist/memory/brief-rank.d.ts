import type { Note } from "./notes.js";
export declare const MAX_NOTES = 8;
export interface Ranked {
    readonly note: Note;
    /** Linked to this issue, linked to an issue it mentions, naming a file it touches, or sharing its words. */
    readonly why: "link" | "related" | "file" | "words";
    readonly score: number;
}
/** The words a note is matched on: lowercase, four or more characters, common words left out. */
export declare const terms: (text: string) => string[];
/** Whether a word is one `terms` can return, so a rule built on it can match. */
export declare const isSearchTerm: (word: string) => boolean;
/** The notes that bear on `issue`, best first, at most MAX_NOTES. `query` and `files` are what the issue says and names. */
export declare function rankNotes(notes: ReadonlyArray<Note>, issue: number, query: string, files: ReadonlyArray<string>, refs: ReadonlyArray<number>): Ranked[];
//# sourceMappingURL=brief-rank.d.ts.map