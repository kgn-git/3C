<!-- Generated from ${FRAMEWORK_NAME} default review checklist — see ${FRAMEWORK_DOMAIN}. -->

# ${FRAMEWORK_NAME} default review checklist

Apply every section below to every changed file. Each section's anchor name is stable; future ${FRAMEWORK_NAME} extensions add new sections rather than restructure these.

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
- Can each added assertion ever be false? `toBeDefined()`, `toBeTruthy()`, `assert.ok()`, `assertNotNull()` and `is not None` all pass the moment the symbol exists and assert nothing about behaviour — treat one as `critical`.
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

## File size and comments

Read `.claude/rules/quality/file-size-and-comments/file-size-and-comments.md` and apply it to the lines the change touches. Its thresholds live in that file only. If `.claude/rules/quality/file-size-and-comments/` is absent, skip this section, say in the report that it was skipped, and name `${FRAMEWORK_SLUG} rules install quality/file-size-and-comments` to restore it. Each check opens with its id and default severity; start a finding's description with the id.

- `size-cap` (`major`) — Does a changed file now exceed the pack's code-line cap, or sit in its tolerance band without a header comment saying why no seam exists?
- `size-signal` (`suggestion`) — Has a changed non-test file passed the pack's review signal while a behavioural seam to split it along is visible?
- `comment-what` (`minor`) — Does an added comment restate what the code does, or annotate code that explains itself?
- `comment-history` (`minor`) — Does an added comment narrate development history (what the code used to do, who changed it, which issue asked for it)? A history comment on an untouched line of an edited file is at most a `suggestion` to remove.
- `comment-safeguard` (`major`) — Does an added comment stand in for a safeguard ("do not remove", "keep in sync") where a test should pin the behaviour?
- `comment-claim` (`major`) — Does an added comment make a property claim ("only", "every", "never", "cannot") that the code does not show and no test pins?
- `comment-line-ref` (`minor`) — Does an added comment cite a line number instead of a symbol?
- `commented-out-code` (`minor`) — Is commented-out code being committed?
- `comment-ratio` (`suggestion`) — Does a changed implementation file read as mostly comment? Judge it by eye against the pack's ratio; configuration files are exempt.
- `pack-changed` (`major`) — Does the change edit the file-size-and-comments pack itself? Flag it for a reviewer's explicit sign-off, and judge the rest of the change against the base branch's copy of the pack, not the edited one.
