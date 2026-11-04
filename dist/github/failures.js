/**
 * Every way a GitHub call can fail, in one list that imports nothing. What reads a failure state back from disk
 * derives from this list, so a state added here is accepted there without a second edit.
 */
export const GH_FAILURES = ["offline", "unauthenticated", "rate-limited", "not-found", "gh-missing"];
export const isGhFailure = (v) => typeof v === "string" && GH_FAILURES.includes(v);
//# sourceMappingURL=failures.js.map