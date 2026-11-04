/**
 * Every way a GitHub call can fail, in one list that imports nothing. What reads a failure state back from disk
 * derives from this list, so a state added here is accepted there without a second edit.
 */
export declare const GH_FAILURES: readonly ["offline", "unauthenticated", "rate-limited", "not-found", "gh-missing"];
export type GhFailure = (typeof GH_FAILURES)[number];
export declare const isGhFailure: (v: unknown) => v is GhFailure;
//# sourceMappingURL=failures.d.ts.map