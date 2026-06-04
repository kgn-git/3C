/** Commands THIS binary supports. Reflects the binary's version (older builds lack reconcile/deps). */
export declare const CLI_COMMANDS: ReadonlySet<string>;
/**
 * Extract CLI command tokens invoked as `<slug> <cmd>`. Anchored on a pipe or a
 * backtick so genuine invocations match but prose mentions ("the 3c framework")
 * and the slash-command form (`/3c-review-board`) do not.
 */
export declare function referencedCliCommands(text: string, slug: string): Set<string>;
/** Return {skill, command} for each referenced command the running CLI does not support. */
export declare function checkCliSkillCompat(skills: ReadonlyArray<{
    readonly name: string;
    readonly text: string;
}>, slug: string, supported: ReadonlySet<string>): ReadonlyArray<{
    readonly skill: string;
    readonly command: string;
}>;
//# sourceMappingURL=cli-compat.d.ts.map