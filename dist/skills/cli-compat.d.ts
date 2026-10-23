/** Commands THIS binary supports. */
export declare const CLI_COMMANDS: ReadonlySet<string>;
/** Extract CLI command tokens invoked as `<slug> <cmd>`. */
export declare function referencedCliCommands(text: string, slug: string): Set<string>;
/**
 * Retired commands: a subcommand pair or a whole verb. A verb that leaves
 * `CLI_COMMANDS` is registered BARE, even if it had subcommands (`standards`),
 * else `retiredVerbs()` misses it and `checkCliSkillCompat` tells an adopter
 * who just upgraded that their CLI is too old. A fold registers like a
 * deletion: the list answers "will typing this word work?".
 *
 * Deny-list, not allow-list: templates legitimately invoke many pairs, and an
 * allow-list would need updating on every new subcommand.
 */
export declare const RETIRED_COMMANDS: ReadonlySet<string>;
/** The bare verbs in `retired` — those with no space, i.e. whole-command retirements. */
export declare function retiredVerbs(retired?: ReadonlySet<string>): Set<string>;
/**
 * Retirement predicates. Each carries its own auxiliary so it matches only a
 * claim whose subject is the command right before it; bare keywords or filler
 * slack would excuse live text such as "`3c test scaffold` output is
 * superseded on each run".
 */
export declare const RETIREMENT_PATTERNS: ReadonlyArray<RegExp>;
/**
 * Extract retired `<slug> <verb> <sub>` pairs INVOKED in `text`; a match whose
 * own sentence records the retirement is not an invocation.
 *
 * Horizontal whitespace is collapsed but newlines are kept, so a pair split by
 * a hard wrap still matches while block structure survives for BOUNDARY.
 */
export declare function referencedRetiredCommands(text: string, slug: string, retired?: ReadonlySet<string>): Set<string>;
/** Return {skill, command} for each referenced command the running CLI does not support. */
export declare function checkCliSkillCompat(skills: ReadonlyArray<{
    readonly name: string;
    readonly text: string;
}>, slug: string, supported: ReadonlySet<string>): ReadonlyArray<{
    readonly skill: string;
    readonly command: string;
}>;
//# sourceMappingURL=cli-compat.d.ts.map