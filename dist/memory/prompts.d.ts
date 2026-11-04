export type PromptKind = "brief" | "deliver" | "decide";
export interface Prompt {
    readonly kind: PromptKind;
    readonly label: string;
    readonly text: string;
    /** Skills in `.claude/skills` the prompt starts; empty when it runs a command or asks for a line. */
    readonly skills: ReadonlyArray<string>;
}
/** The owner completes this line with a real date and their own words; the date is not filled in for them. */
export declare const DECISION_LINE = "Owner decision (YYYY-MM-DD): ";
/** An issue number from a raw word, or null: digits only, no sign, no leading zero, at most nine of them. */
export declare function parseIssueWord(word: string): number | null;
/** Whether `n` is an issue number a prompt or a command may carry: a whole number from 1 to 999999999. */
export declare const isIssueNumber: (n: number) => boolean;
export declare function promptFor(kind: PromptKind, issue: number): string;
/** Every kind for one issue, in a fixed order. */
export declare function promptsFor(issue: number): Prompt[];
/** The command that reads a handover, for a person to run; built from the same checked number. */
export declare const ghViewCommand: (handover: number) => string;
/** The skills the prompts start, once each, in the order first named. */
export declare function skillsOf(prompts: ReadonlyArray<Prompt>): string[];
/** One line of printable ASCII, so a prompt cannot carry a control, bidi or invisible character. */
export declare const isPrintableLine: (text: string) => boolean;
//# sourceMappingURL=prompts.d.ts.map