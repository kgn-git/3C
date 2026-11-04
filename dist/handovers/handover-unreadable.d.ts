/** Also bounds the delivery records, and the blocks with an undefined key, that the cache will accept. */
export declare const ISSUE_CAP = 500;
export interface Unreadable {
    /** Null for a gh item that carried no issue number. */
    readonly issue: number | null;
    readonly kind: "legacy" | "malformed";
    readonly reason: string;
}
export declare const LEGACY_REASON = "older handover with no delivery block";
export declare const NO_NUMBER_REASON = "item has no issue number";
/** The only source of the two counts, so they cannot drift from the list. */
export declare const countUnreadable: (list: ReadonlyArray<Unreadable>) => {
    legacy: number;
    malformed: number;
};
//# sourceMappingURL=handover-unreadable.d.ts.map