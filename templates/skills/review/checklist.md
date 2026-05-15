<!-- Generated from ${BRAND_NAME} default review checklist — see ${FRAMEWORK_DOMAIN}. -->

# ${BRAND_NAME} default review checklist

Apply the four sections below to every changed file. Each section's anchor name is stable; future ${BRAND_NAME} extensions add new sections rather than restructure these.

## Code Quality

- Are public functions, types, and modules named consistently with the rest of the file?
- Are there magic numbers, magic strings, or copy-pasted blocks that should be extracted?
- Does any new code path lack obvious error handling at the boundary it crosses (network, filesystem, user input)?
- Are there `TODO` / `FIXME` / `XXX` comments left behind without a linked issue?
- Is dead code (unused exports, commented-out blocks, unreachable branches) being introduced?

## Security

- Does any new code interpolate user input into a SQL query, shell command, file path, HTML, or URL without parameterisation / escaping / a path-traversal guard?
- Are credentials, tokens, private keys, internal hostnames, or production IPs being added to source, fixtures, comments, or logs?
- Is `eval` / `Function()` / `child_process.exec` (string form) / `setTimeout` with string argument being added?
- Are externally-fetched documents being parsed without size limit or schema validation?
- If the team has installed an OWASP rule pack at `.claude/rules/security/owasp-top-10/*.md`, cite the matching rule file in your suggested fix.

## Testing

- Does every new public function have at least one test exercising the happy path and one edge case?
- Are tests asserting *behaviour* (return values, side effects, throws) rather than implementation detail (which functions got called)?
- Are fixtures using obviously-fake credentials (`PLACEHOLDER_API_KEY`, `<<example-token>>`) and not real-looking ones?
- Are flaky-prone patterns being introduced (sleep-based waits, network-dependent assertions, time-of-day branches)?
- Do new untested branches exist that the developer can reasonably cover?

## Architecture

- Does the change respect the layering / dependency direction of the existing module (e.g., domain doesn't import infrastructure; outer layers depend inward)?
- If the team has installed an architecture pattern pack at `.claude/rules/patterns/*/`, cite the matching pattern file in your suggested fix when a rule applies.
- Does this introduce a new third-party dependency? If yes, name the dependency, surface it as a `suggestion`-severity finding, and explain why it warrants a vendoring/security review.
- Is a public API being changed in a way that would break downstream consumers without a corresponding deprecation note?
- Does the file's responsibility grow beyond its named purpose (a file called `auth.ts` accumulating routing logic, etc.)?
