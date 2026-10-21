/** Commands THIS binary supports. Reflects the binary's version (older builds lack reconcile/deps). */
export declare const CLI_COMMANDS: ReadonlySet<string>;
/** Extract CLI command tokens invoked as `<slug> <cmd>`. */
export declare function referencedCliCommands(text: string, slug: string): Set<string>;
/**
 * Commands this framework has RETIRED (#406, epic #392) — either a subcommand
 * pair (`test scaffold`) or a whole top-level verb (`drift`).
 *
 * BOTH shapes are required, because epic #392 retires both: `test scaffold` is a
 * pair, while `drift` (#394 — `analyze` was its only subcommand, so the whole
 * verb goes), `explain`, `deploy`, `upgrade`, `standards`, `coverage-gate` and
 * `onboard-guide` are verbs. A pair-only deny-list would leave a retired verb to
 * fall through to `checkCliSkillCompat`, whose message says "the CLI on PATH is
 * older — upgrade the CLI": the exact misdirection this issue exists to remove,
 * aimed at an adopter who has just upgraded.
 *
 * #399 registered `onboard-guide`, which this comment previously described as
 * "deliberately NOT registered below — it is still dispatched". It is not: the
 * verb was FOLDED into `onboard --role`. A fold registers here exactly as a
 * deletion does, because the deny-list answers "will typing this word work?",
 * not "does the capability still exist" — and the replacement sentence in
 * `RETIREMENT_REPLACEMENTS` is where the surviving flag is named.
 *
 * #396 CORRECTED a claim this comment used to make: the `standards` group is NOT
 * registered as pairs. The group was retired OUTRIGHT — no `rules history` verb
 * was created, because a fold relocates a dead-end rather than closing one — so
 * `standards` leaves `CLI_COMMANDS` entirely and must be the bare verb, exactly
 * as `drift` is. Registered as pairs it would leave `retiredVerbs()` without
 * `standards`, and a bare `3c standards` in stale skill text would land in the
 * skew check described above.
 *
 * Detection is deny-list driven, not allow-list driven. Matching every pair
 * against a set of *supported* pairs would redden a correct install — shipped
 * templates legitimately invoke `test write`, `rules apply`, `deps order`,
 * `arch-check check` and more — and that list would need maintaining on every
 * new subcommand. A deny-list only grows when something is deliberately retired.
 */
export declare const RETIRED_COMMANDS: ReadonlySet<string>;
/** The bare verbs in `retired` — those with no space, i.e. whole-command retirements. */
export declare function retiredVerbs(retired?: ReadonlySet<string>): Set<string>;
/**
 * Retirement PREDICATES. Each carries its own auxiliary, so it can only match a
 * claim whose subject is the command immediately before it.
 *
 * Bare keywords do not work, and neither does allowing filler words between the
 * command and the keyword. `\bsuperseded\b` with three tokens of slack excused
 * "`3c test scaffold` output is superseded on each run"; `\bused to\b` excused
 * "`3c test scaffold` is used to generate the first failing test". Both are
 * LIVE instructions. Token-counting was also brittle in its own right — the rule
 * flipped from flagged to exempt when one adjective was deleted from a sentence.
 */
export declare const RETIREMENT_PATTERNS: ReadonlyArray<RegExp>;
/**
 * Extract retired `<slug> <verb> <sub>` pairs INVOKED in `text`.
 *
 * Anchored at a pipe, a backtick, OR THE START OF A LINE. The line-start
 * alternative is not optional: every real invocation in a shipped skill lives
 * inside a ```bash fence, where the preceding characters are the language tag
 * (```bash), not a backtick adjacent to the command. Anchoring on backticks
 * alone made this scan blind to the exact artefact it exists to find.
 *
 * Horizontal whitespace is collapsed but NEWLINES ARE KEPT, so a pair split
 * across a hard line wrap still matches (`\s+` spans the break) while block
 * structure survives for the boundary scan below.
 *
 * A match whose own sentence records the retirement is not an invocation (D2).
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