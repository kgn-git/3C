export declare const REVIEW_CATEGORIES: ReadonlySet<string>;
export declare const REVIEW_LIMITS: {
    readonly countMax: 1000;
    readonly boardRounds: 50;
};
/**
 * A copy of `by_category` with no prototype, or null when it is not a map of
 * listed categories to bounded counts. The copy is the record's only form, so
 * a lookup by an arbitrary name cannot reach `Object.prototype`.
 */
export declare function readByCategory(v: unknown): Readonly<Record<string, number>> | null;
//# sourceMappingURL=review-data.d.ts.map