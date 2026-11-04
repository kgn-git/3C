/** A handover block that was read, and the keys in it that its schema does not define. */
export interface Noted {
    readonly issue: number;
    /** `verdict.<key>` or `loc.<key>`. */
    readonly keys: ReadonlyArray<string>;
}
/** Bounds the keys one handover can put on a line of the view, across its verdict and loc blocks together. */
export declare const MAX_NOTED_KEYS = 10;
/** Closes a list that was cut at MAX_NOTED_KEYS, so the cut is visible. */
export declare const MORE_KEYS = "(more keys not listed)";
/** Stands in for a key that holds anything a terminal could act on. */
export declare const UNPLAIN_KEY = "(a key that is not plain text)";
export declare const notedKey: (block: "verdict" | "loc", key: string) => string;
/** Whether a stored key is one `notedKey` could have written. */
export declare function isNotedKey(v: unknown): v is string;
//# sourceMappingURL=handover-noted.d.ts.map