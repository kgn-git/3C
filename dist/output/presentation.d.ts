export interface Presentation {
    readonly results: string;
    /** Interpret clean results too; a bare `0` is ignored. */
    readonly meaning: string;
    /** Runnable steps, not advice. */
    readonly nextSteps: readonly string[];
    readonly artifact?: string;
}
//# sourceMappingURL=presentation.d.ts.map