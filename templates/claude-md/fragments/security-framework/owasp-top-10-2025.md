Security follows the OWASP Top 10:2025 baseline:

- **A01 Broken Access Control** — every request boundary MUST enforce authorisation server-side; deny-by-default.
- **A02 Security Misconfiguration** — security defaults MUST be hardened (no debug endpoints, no default credentials).
- **A03 Software Supply Chain Failures** — third-party dependencies MUST be pinned; SBOMs SHOULD be produced; build pipelines SHOULD be reproducible.
- **A04 Cryptographic Failures** — sensitive data MUST be encrypted at rest (AES-256) and in transit (TLS 1.3+).
- **A05 Injection** — all input crossing a trust boundary MUST be validated and parameterised before use in queries, shell, or templates.
- **A06 Insecure Design** — threat modelling SHOULD inform new features touching auth, payments, or PII.
- **A07 Authentication Failures** — passwords MUST use modern adaptive hashing; sessions MUST be invalidated on logout and password change.
- **A08 Data Integrity Failures** — deserialisation of untrusted data MUST NOT execute code; signatures SHOULD be verified for software updates.
- **A09 Logging and Monitoring Failures** — security-relevant events MUST be logged; logs MUST NOT contain secrets or PII in cleartext.
- **A10 Mishandling of Exceptional Conditions** — error paths MUST fail closed; unexpected exceptions MUST NOT leak stack traces or implementation detail to users.

> Source: OWASP Foundation, *OWASP Top 10:2025* — https://owasp.org/Top10/2025/.
