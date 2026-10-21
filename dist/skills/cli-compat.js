import { fenceCharOf } from "../validate/_markdown.js";
// #278 — Skill↔CLI version-compatibility guard.
// Installed crew skills shell out to `<slug> reconcile` (and `<slug> deps`). When the
// `<slug>` binary on PATH predates those commands, the call fails and the skill silently
// degrades. These helpers let `doctor` detect that skew.
/** Commands THIS binary supports. Reflects the binary's version (older builds lack reconcile/deps). */
export const CLI_COMMANDS = new Set([
    "init", "setup", "rules", "hook", "bypass", "skills", "agents", "test",
    "create-issue", "doctor", "arch-check", "deps", "reconcile",
    "dashboard", "scan-secrets",
    "security", "debug", "bug", "onboard", "implement",
]);
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * What may precede a genuine invocation: a pipe, a backtick, or the start of a
 * line (optionally after a `$ ` prompt or `npx`). Shared by both extractors —
 * they were diverging, and the backtick-only form could not see a command
 * inside a ```bash fence, which is where every real invocation lives (#406).
 * Prose mentions ("the 3c framework") and the slash-command form
 * (`/3c-review-board`) still do not match.
 */
const INVOCATION_ANCHOR = "(?:^|[|`])[ ]*(?:\\$ )?(?:npx )?";
/**
 * Byte ranges of fenced-code content in `src` (delimiter lines excluded).
 *
 * The line-start anchor is only trustworthy inside a fence. In prose it reads
 * ordinary markdown as a command — "3c never phones home" yields the command
 * `never` — and for `checkCliSkillCompat`, which hard-fails, that means a
 * permanently-red doctor telling an adopter to upgrade a current CLI.
 */
function fencedRanges(src) {
    const out = [];
    let pos = 0;
    let openAt = -1;
    let openChar = null;
    for (const line of src.split("\n")) {
        const fc = fenceCharOf(line);
        if (fc !== null) {
            if (openChar === null) {
                openChar = fc;
                openAt = pos + line.length + 1;
            }
            else if (openChar === fc) {
                out.push([openAt, pos]);
                openChar = null;
            }
        }
        pos += line.length + 1;
    }
    // An unterminated fence swallows the rest of the document (CommonMark).
    if (openChar !== null)
        out.push([openAt, src.length]);
    return out;
}
/** True when the match at `i` began at a line start rather than a pipe/backtick. */
function isLineStartForm(src, i) {
    const c = src[i];
    return c !== "`" && c !== "|";
}
function scanInvocations(src, slug, tail, onMatch) {
    const re = new RegExp(INVOCATION_ANCHOR + escapeRegExp(slug) + tail, "gm");
    const fences = fencedRanges(src);
    const inFence = (i) => fences.some(([a, b]) => i >= a && i < b);
    let m;
    while ((m = re.exec(src)) !== null) {
        if (isLineStartForm(src, m.index) && !inFence(m.index))
            continue;
        onMatch(m);
    }
}
/** Extract CLI command tokens invoked as `<slug> <cmd>`. */
export function referencedCliCommands(text, slug) {
    const out = new Set();
    scanInvocations(text, slug, "\\s+([a-z][a-z-]+)", (m) => {
        if (m[1])
            out.add(m[1]);
    });
    return out;
}
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
export const RETIRED_COMMANDS = new Set([
    "test scaffold", // #404 — the generator was retired; TDD is enforced at the skill level.
    // #394 — the whole verb, not the pair: `analyze` was drift's only subcommand,
    // and the verb leaves CLI_COMMANDS entirely. Registering the pair instead
    // would leave `retiredVerbs()` empty for drift, so `doctor` could not
    // subtract it from the cli-compat check and a bare `3c drift` in stale skill
    // text would read as "the CLI on PATH is older", aimed at an adopter who has
    // just upgraded. Layer-boundary checking survives in `arch-check`.
    "drift",
    // #395 — a whole verb too: `<rule-id>` was an argument, not a subcommand, so
    // there is no pair to register. The rationale subsystem it fronted shipped
    // with zero content (no `*.rationale.yaml` ever existed in any bundled pack),
    // so nothing survives it — the reasoning that exists lives in the rule files.
    "explain",
    // #396, all four as BARE VERBS. `standards` is the one worth pausing on: it
    // had two subcommands (`history`, `as-of`) and the pair shape would have been
    // the obvious registration, but the group is retired outright and the verb
    // leaves CLI_COMMANDS, so the bare form is what keeps `retiredVerbs()`
    // able to subtract it from the skew check. See the note above.
    "upgrade",
    "standards",
    "deploy",
    "coverage-gate",
    // #399. A FOLD — `onboard --role <frontend|backend|devops>` carries the
    // capability forward — but the VERB is gone, so it registers here exactly as
    // a deletion would. Bare, because `--role` was a flag rather than a
    // subcommand: there is no pair to register.
    "onboard-guide",
]);
/** The bare verbs in `retired` — those with no space, i.e. whole-command retirements. */
export function retiredVerbs(retired = RETIRED_COMMANDS) {
    return new Set([...retired].filter((c) => !c.includes(" ")));
}
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
export const RETIREMENT_PATTERNS = [
    // The participle must END its clause. Without the lookahead these are
    // transitive verbs, so "`3c test scaffold` has already deleted the stale file"
    // — a live description of what the command DOES — read as a claim that the
    // command itself was deleted.
    //
    // What ends a clause has to be generous, because the cost of getting it wrong
    // in THIS direction is a hard doctor failure on a correctly-documented file,
    // with a destructive `--replace` as the named repair. A first draft accepted
    // only `.`-style punctuation and a few prepositions, which rejected "was
    // retired — use X" (this codebase's house style), "was retired (see #404)",
    // "was retired and replaced by …", "was **retired** in v1.8", and a note
    // ending a bullet with no punctuation at all. What must stay OUT is a bare
    // noun phrase — "deleted THE STALE FILE" — which is what a direct object
    // looks like.
    /(?:is|was|were|are|has|have|had)\s+(?:now\s+|since\s+|already\s+)?(?:been\s+)?[*_]{0,2}(?:retired|removed|withdrawn|dropped|deleted|superseded)\b(?=[\s)\]}"'*_]*(?:$|[.!?:;,]|[—–]|-\s|\(|\b(?:in|by|from|since|as of|and|when|because|per)\b))/i,
    /no longer (?:exists|ships|available|supported|provided|part of)\b/i,
    /used to (?:exist|be|ship|live)\b/i,
    /replaced by\b/i,
    /superseded by\b/i,
    /is gone\b/i,
];
/**
 * Nothing but punctuation, quoting and whitespace may sit between the command
 * and its predicate, so a claim about anything else cannot excuse it.
 */
const RECORDS_RETIREMENT = new RegExp("^[\\s`'\")\\]}>;:,.\\-]*(?:" +
    RETIREMENT_PATTERNS.map((r) => r.source).join("|") +
    ")", "i");
/** Widest slice either side of a match considered "the same sentence". */
const SENTENCE_WINDOW = 200;
/**
 * Where the exemption stops reaching forward.
 *
 * Only four alternates, and each is REACHABLE: the exemption bridges nothing
 * but the characters in RECORDS_RETIREMENT's leading class, so a `#`, `*`, `+`,
 * digit, `!` or `?` already stops it dead. Alternates for those rode along for a
 * round and could be deleted with the suite green — dead regex in a guard is how
 * the next reader mis-reasons about what is enforced.
 *
 * #425: the fourth alternate is the CLOSING FENCE, and its absence was a
 * fail-open. RECORDS_RETIREMENT's leading class eats backticks and newlines, so
 * a retirement note written directly under a ``` line reached back INTO the code
 * block and excused the invocation above it — `referencedRetiredCommands`
 * returned empty over a fenced command that still runs, for the adopter's
 * `3c doctor` as much as for our own gate. A blank line, a list marker or a
 * trailing argument each closed it, which is why every real file was safe and
 * no corpus evidence could find it.
 */
const BOUNDARY = /[.](?=\s|$)|\n[ \t]*[->][ \t]|\n[ \t]*\n|\n[ \t]*(?:```|~~~)/g;
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
export function referencedRetiredCommands(text, slug, retired = RETIRED_COMMANDS) {
    const src = text.replace(/[^\S\n]+/g, " ");
    const out = new Set();
    scanInvocations(src, slug, "\\s+([a-z][a-z-]+)(?:\\s+([a-z][a-z-]+))?", (m) => {
        // Pair wins over verb: `test scaffold` is retired while `test` still ships.
        const pair = m[2] ? `${m[1]} ${m[2]}` : "";
        const hit = pair && retired.has(pair) ? pair : retired.has(m[1] ?? "") ? m[1] : "";
        if (!hit)
            return;
        // All boundary work happens inside a fixed-size window, so cost per match is
        // constant. Scanning the whole document per match made this quadratic on a
        // file that repeats a retired command (CWE-400).
        const end = m.index + m[0].length;
        const win = src.slice(end, Math.min(src.length, end + SENTENCE_WINDOW));
        // Bounded to the block the match sits in. Without this, a retirement note
        // written BELOW a fenced invocation — the shape of a half-edited artefact —
        // reaches back up and excuses it.
        const fwd = new RegExp(BOUNDARY.source, "g");
        const b = fwd.exec(win);
        const stop = b === null ? win.length : b.index + b[0].length;
        if (RECORDS_RETIREMENT.test(win.slice(0, stop)))
            return;
        out.add(hit);
    });
    return out;
}
/** Return {skill, command} for each referenced command the running CLI does not support. */
export function checkCliSkillCompat(skills, slug, supported) {
    const out = [];
    for (const s of skills) {
        for (const cmd of referencedCliCommands(s.text, slug)) {
            if (!supported.has(cmd))
                out.push({ skill: s.name, command: cmd });
        }
    }
    return out;
}
//# sourceMappingURL=cli-compat.js.map