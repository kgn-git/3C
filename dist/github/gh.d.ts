export type GhFailure = "offline" | "unauthenticated" | "rate-limited" | "not-found" | "gh-missing";
export interface GhCall {
    readonly timeoutMs: number;
    readonly maxBuffer: number;
}
export type GhOutcome = {
    readonly ok: true;
    readonly stdout: string;
} | {
    readonly ok: false;
    readonly failure: GhFailure;
    readonly detail: string;
};
export type GhExec = (args: readonly string[], call: GhCall) => Promise<GhOutcome>;
/** Classifies an `execFile` rejection; `detail` is for the local log, never the UI. */
export declare function classifyGhError(err: {
    readonly code?: unknown;
    readonly killed?: boolean;
    readonly signal?: unknown;
    readonly stderr?: string;
}): {
    failure: GhFailure;
    detail: string;
};
export declare const execGh: GhExec;
/** `owner/repo` from a github.com remote URL, or null for anything else. */
export declare function parseGithubRemote(url: string): string | null;
/** The `origin` remote's repository, read from git config without a network call. */
export declare function originRepo(cwd: string): Promise<string | null>;
//# sourceMappingURL=gh.d.ts.map