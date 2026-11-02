export type NoteKind = "change" | "lesson" | "decision" | "follow-up" | "open";
export interface Note {
    readonly id: string;
    readonly handover: number;
    readonly issues: ReadonlyArray<number>;
    readonly kind: NoteKind;
    readonly text: string;
}
export declare const NOTE_KINDS: ReadonlySet<string>;
export declare const NOTE_LIMITS: {
    readonly chars: 600;
};
export interface SplitResult {
    readonly notes: ReadonlyArray<Note>;
    /**
     * For each note, every run of neighbouring lines it wrapped over, joined with no gap, each as a string
     * of its own. A detector needs a secret's own edges at the string's edges, which a run gives it when a
     * line break split the secret.
     */
    readonly wrapped: ReadonlyArray<ReadonlyArray<string>>;
    /** Pieces left out, so a sync can say what it did not keep. */
    readonly refused: {
        readonly fenced: number;
        readonly long: number;
        /** Notes holding whitespace the splitter would otherwise have turned into a plain space. */
        readonly control: number;
        /** Notes wrapped over more lines than the screen of wrapped secrets will cover. */
        readonly wrapped: number;
        /** Lines after a code block that never closes, inside a section the memory reads. */
        readonly unclosed: number;
    };
}
export declare function splitNotes(handover: number, issues: ReadonlyArray<number>, body: string): SplitResult;
//# sourceMappingURL=notes.d.ts.map