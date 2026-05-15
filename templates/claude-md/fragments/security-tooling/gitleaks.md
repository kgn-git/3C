Secret scanning is enforced by gitleaks:

- A pre-commit hook MUST run gitleaks against staged changes before any commit lands.
- CI MUST run gitleaks against the full diff on every pull request.
- Findings MUST block merge until either the secret is rotated AND removed from history, OR a documented allowlist entry is added.

> Source: gitleaks — https://github.com/gitleaks/gitleaks.
