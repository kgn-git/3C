import { fenceCharOf } from "../validate/_markdown.js";
// Skill↔CLI version-compatibility guard: installed skills shell out to
// `<slug> reconcile` / `<slug> deps`, and an older binary on PATH makes them
// degrade silently. These helpers let `doctor` detect that skew.
/** Commands THIS binary supports. */
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
 * What may precede a genuine invocation: a pipe, a backtick, or a line start
 * (optionally after `$ ` or `npx`). Shared by both extractors so they cannot
 * diverge; the line-start form is what sees a command inside a ```bash fence.
 */
const INVOCATION_ANCHOR = "(?:^|[|`])[ ]*(?:\\$ )?(?:npx )?";
/**
 * Byte ranges of fenced-code content in `src` (delimiter lines excluded).
 * The line-start anchor is trusted only inside a fence: in prose, "3c never
 * phones home" yields the command `never`, and `checkCliSkillCompat`
 * hard-fails on it.
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
    // CommonMark: an unterminated fence swallows the rest of the document.
    if (openChar !== null)
        out.push([openAt, src.length]);
    return out;
}
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
 * Retired commands: a subcommand pair or a whole verb. A verb that leaves
 * `CLI_COMMANDS` is registered BARE, even if it had subcommands (`standards`),
 * else `retiredVerbs()` misses it and `checkCliSkillCompat` tells an adopter
 * who just upgraded that their CLI is too old. A fold registers like a
 * deletion: the list answers "will typing this word work?".
 *
 * Deny-list, not allow-list: templates legitimately invoke many pairs, and an
 * allow-list would need updating on every new subcommand.
 */
export const RETIRED_COMMANDS = new Set([
    "test scaffold", // TDD is enforced at the skill level instead.
    // Bare: `analyze` was its only subcommand. Layer-boundary checking lives in `arch-check`.
    "drift",
    // Bare: `<rule-id>` was an argument, not a subcommand.
    "explain",
    "upgrade",
    "standards",
    "deploy",
    "coverage-gate",
    // Folded into `onboard --role`; bare because `--role` is a flag, not a subcommand.
    "onboard-guide",
]);
/** The bare verbs in `retired` — those with no space, i.e. whole-command retirements. */
export function retiredVerbs(retired = RETIRED_COMMANDS) {
    return new Set([...retired].filter((c) => !c.includes(" ")));
}
/**
 * Retirement predicates. Each carries its own auxiliary so it matches only a
 * claim whose subject is the command right before it; bare keywords or filler
 * slack would excuse live text such as "`3c test scaffold` output is
 * superseded on each run".
 */
export const RETIREMENT_PATTERNS = [
    // The participle must END its clause, else "has already deleted the stale
    // file" (a live description) reads as a retirement. Clause ends are generous
    // ("— use X", "(see …)", "and replaced by", "**retired** in v1.8", no
    // punctuation) because a miss here is a hard doctor failure on a correct
    // file; only a direct object must stay out.
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
/** Widest slice after a match considered "the same sentence". */
const SENTENCE_WINDOW = 200;
/**
 * Where the exemption stops reaching forward. RECORDS_RETIREMENT's leading
 * class already stops at `#`, `*`, `+`, digits, `!` and `?`, so only these
 * four alternates are reachable; a dead alternate misleads the next reader.
 * The closing-fence alternate prevents a fail-open: that class eats backticks
 * and newlines, so a note directly under a closing fence would otherwise
 * excuse the invocation inside it.
 */
const BOUNDARY = /[.](?=\s|$)|\n[ \t]*[->][ \t]|\n[ \t]*\n|\n[ \t]*(?:```|~~~)/g;
/**
 * Extract retired `<slug> <verb> <sub>` pairs INVOKED in `text`; a match whose
 * own sentence records the retirement is not an invocation.
 *
 * Horizontal whitespace is collapsed but newlines are kept, so a pair split by
 * a hard wrap still matches while block structure survives for BOUNDARY.
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
        // A fixed-size window keeps cost per match constant; scanning the whole
        // document per match is quadratic on a file that repeats a command (CWE-400).
        const end = m.index + m[0].length;
        const win = src.slice(end, Math.min(src.length, end + SENTENCE_WINDOW));
        // Bounded to the match's block, so a note written below a fenced
        // invocation cannot excuse it.
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