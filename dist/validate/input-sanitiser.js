// Input sanitisation per AC11 of issue #1.
// Two responsibilities, kept separate in the result:
// 1. Strip ASCII control characters (always applied; never rejects).
// 2. Detect prompt-injection patterns that should never reach Claude's context.
// Control chars: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
// (preserve TAB 0x09, LF 0x0A, CR 0x0D)
// Plus zero-width characters often used for obfuscation (U+200B-200D, U+FEFF).
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F​-‍﻿]/g;
const INJECTION_RULES = [
    {
        pattern: /ignore\s+previous/i,
        reason: "contains 'ignore previous' (prompt-injection pattern)",
    },
    {
        pattern: /\bsystem:\s/i,
        reason: "contains 'system:' role marker (prompt-injection pattern)",
    },
    {
        pattern: /<\|[^|]*\|>/,
        reason: "contains '<|...|>' framing token (prompt-injection pattern)",
    },
];
export function sanitiseInput(text) {
    const clean = text.replace(CONTROL_CHAR_PATTERN, "");
    const reasons = [];
    for (const rule of INJECTION_RULES) {
        if (rule.pattern.test(clean)) {
            reasons.push(rule.reason);
        }
    }
    return { clean, rejected: reasons.length > 0, reasons };
}
//# sourceMappingURL=input-sanitiser.js.map