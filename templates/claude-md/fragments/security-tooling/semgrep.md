Static analysis is enforced by Semgrep:

- A baseline ruleset MUST run on every pull request; high-severity findings MUST block merge.
- Custom rules SHOULD be added when a recurring code-quality issue is identified in review.
- Suppressions MUST cite a justification comment.

> Source: Semgrep — https://semgrep.dev/.
