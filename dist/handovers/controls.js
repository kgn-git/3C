// Text that renders on one line must not hide or reorder what a reader sees (CWE-1007), so whole Unicode
// classes are refused, not a list: control, format (zero-width joiners included, so some Persian and
// emoji text is refused too), line and paragraph separators, and variation selectors.
const CLASSES = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Variation_Selector}]/u;
// Invisible fillers the classes miss. Numbers, because an escape in source can reach the file as the raw character.
export const EXTRA_INVISIBLE = [
    [0x034f, 0x034f],
    [0x115f, 0x1160],
    [0x17b4, 0x17b5],
    [0x3164, 0x3164],
    [0xffa0, 0xffa0],
];
export function hasControl(text) {
    if (CLASSES.test(text))
        return true;
    for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 0;
        if (EXTRA_INVISIBLE.some(([lo, hi]) => cp >= lo && cp <= hi))
            return true;
    }
    return false;
}
//# sourceMappingURL=controls.js.map