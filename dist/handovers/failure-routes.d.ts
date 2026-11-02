import type { GhFailure } from "../github/gh.js";
/** The next step for a failed or missing fetch; `retry` is the command that fetches again. */
export declare function failureRoute(state: GhFailure | "never-fetched", retry: string): string;
//# sourceMappingURL=failure-routes.d.ts.map