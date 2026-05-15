import type { Selections } from "../generator/template.js";
export interface SelectChoice {
    readonly value: string;
    readonly name: string;
    readonly description?: string;
}
export interface CheckboxChoice extends SelectChoice {
    readonly checked?: boolean;
}
export interface Prompter {
    select(args: {
        message: string;
        choices: ReadonlyArray<SelectChoice>;
    }): Promise<string>;
    checkbox(args: {
        message: string;
        choices: ReadonlyArray<CheckboxChoice>;
    }): Promise<string[]>;
}
export interface WizardOptions {
    readonly nonInteractive?: boolean;
    readonly prompter?: Prompter;
    /** Optional sink for the AC11 footer warning; defaults to console.error. */
    readonly notice?: (message: string) => void;
}
export declare const DEFAULT_SELECTIONS: Selections;
export declare const INTERACTIVE_FOOTER_WARNING = "Note: your selections become part of Claude Code's instructions. Do not enter secrets, hostnames, or content you would not commit to git.";
export declare function runWizard(opts?: WizardOptions): Promise<Selections>;
//# sourceMappingURL=runner.d.ts.map