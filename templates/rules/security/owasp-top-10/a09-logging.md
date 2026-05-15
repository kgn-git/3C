---
schema_version: 1
description: Logging and monitoring failure prevention — security-relevant event logging without leaking secrets or PII.
globs: ["**/*.{py,ts,js,go,java,rb,php}"]
priority: 10
owasp_version: "2025"
owasp_category: "A09:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A09:2025 Logging and Monitoring Failures — see https://owasp.org/Top10/.

Security event logging:

- Security-relevant events MUST be logged: authentication successes and failures, access control decisions, privilege escalations, and input validation rejections.
- Log entries MUST include timestamp (UTC), event type, principal identity or session reference, and resource identifier; log entries without a timestamp are invalid.
- Logs MUST NOT contain passwords, session tokens, API keys, or full payment card numbers in cleartext; these values MUST be redacted or omitted before writing.
- Logs MUST NOT contain unencoded personal data beyond what is necessary for incident investigation; excess PII MUST be pseudonymised or omitted.
- Log data MUST be written to an append-only or tamper-evident destination; application code MUST NOT have delete or overwrite access to the log store.
- Alerting MUST be configured for high-frequency authentication failures, repeated access-control denials, and anomalous privilege-use patterns.
