export interface Presentation {
    /** What was found — the command's existing summary text, unchanged. */
    readonly results: string;
    /**
     * One plain-language sentence: severity, worst offender, or "this is fine".
     * The clean case is interpreted too; a bare `0` teaches users to ignore the
     * command.
     */
    readonly meaning: string;
    /**
     * Runnable steps: a command to run or a file to change. "Review the
     * findings" is not a step — advice belongs in `meaning`.
     */
    readonly nextSteps: readonly string[];
    /** Optional path to a locally written viewable file. */
    readonly artifact?: string;
}
//# sourceMappingURL=presentation.d.ts.map