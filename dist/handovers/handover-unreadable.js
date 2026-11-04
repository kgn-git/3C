// A leaf with no imports, so the fetcher, the cache and the describer can all
// share these without depending on one another.
/** Also bounds the delivery records, and the blocks with an undefined key, that the cache will accept. */
export const ISSUE_CAP = 500;
export const LEGACY_REASON = "older handover with no delivery block";
export const NO_NUMBER_REASON = "item has no issue number";
/** The only source of the two counts, so they cannot drift from the list. */
export const countUnreadable = (list) => ({
    legacy: list.filter((u) => u.kind === "legacy").length,
    malformed: list.filter((u) => u.kind === "malformed").length,
});
//# sourceMappingURL=handover-unreadable.js.map