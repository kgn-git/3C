// RFC-2119 directive regex per AC3 of issue #1.
// Case-sensitive, word-boundary on both sides; MUST/SHALL/SHOULD optionally followed
// by NOT (with arbitrary whitespace including newlines).
// Decision is load-bearing for VP-03-F08 telemetry and VP-04-F01 dashboard counting —
// must remain stable across releases.
const DIRECTIVE_PATTERN = /\b(MUST(?:\s+NOT)?|SHALL(?:\s+NOT)?|SHOULD(?:\s+NOT)?|MAY)\b/g;
const WARN_THRESHOLD = 120;
const HARD_LIMIT = 150;
export function countInstructions(text) {
    const matches = text.match(DIRECTIVE_PATTERN);
    const count = matches ? matches.length : 0;
    return { count, warnLevel: levelFor(count) };
}
function levelFor(count) {
    if (count >= HARD_LIMIT)
        return "exceeded";
    if (count >= WARN_THRESHOLD)
        return "warn";
    return "ok";
}
//# sourceMappingURL=instruction-count.js.map