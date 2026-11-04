// A leaf with no imports, so the parser, the fetcher, the cache and the describer can share it without
// depending on one another.
/** Bounds the keys one handover can put on a line of the view, across its verdict and loc blocks together. */
export const MAX_NOTED_KEYS = 10;
/** Closes a list that was cut at MAX_NOTED_KEYS, so the cut is visible. */
export const MORE_KEYS = "(more keys not listed)";
/** Stands in for a key that holds anything a terminal could act on. */
export const UNPLAIN_KEY = "(a key that is not plain text)";
const PLAIN = /^[A-Za-z0-9_.-]{1,64}$/;
const NAMED = /^(?:verdict|loc)\.([\s\S]+)$/;
export const notedKey = (block, key) => `${block}.${PLAIN.test(key) ? key : UNPLAIN_KEY}`;
/** Whether a stored key is one `notedKey` could have written. */
export function isNotedKey(v) {
    if (typeof v !== "string")
        return false;
    if (v === MORE_KEYS)
        return true;
    const name = NAMED.exec(v)?.[1];
    return name !== undefined && (name === UNPLAIN_KEY || PLAIN.test(name));
}
//# sourceMappingURL=handover-noted.js.map