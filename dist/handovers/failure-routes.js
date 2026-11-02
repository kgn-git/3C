/** The next step for a failed or missing fetch; `retry` is the command that fetches again. */
export function failureRoute(state, retry) {
    switch (state) {
        case "never-fetched":
            return `${retry}   # fetches the handover issues`;
        case "offline":
            return `Check the network connection, then run ${retry}   # details: .3c/cache/handover-fetch.log`;
        case "unauthenticated":
            return "gh auth login";
        case "rate-limited":
            return `Wait for the GitHub rate limit to reset, then run ${retry}`;
        case "not-found":
            return "git remote get-url origin   # must name a github.com repository you can read (gh repo view)";
        case "gh-missing":
            return "Install the GitHub CLI from https://cli.github.com, then run gh auth login";
        default: {
            // A new failure state is a compile error here; a state past the types is refused rather than shown as advice.
            const unhandled = state;
            throw new Error(`no route for failure state ${String(unhandled)}`);
        }
    }
}
//# sourceMappingURL=failure-routes.js.map