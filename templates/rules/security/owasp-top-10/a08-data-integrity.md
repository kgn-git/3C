---
schema_version: 1
description: Data integrity failure prevention — safe deserialisation, update verification, and CI/CD pipeline integrity.
globs: ["**/*.{py,ts,js,go,java,rb,php}"]
priority: 10
owasp_version: "2025"
owasp_category: "A08:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A08:2025 Data Integrity Failures — see https://owasp.org/Top10/.

Data and software integrity:

- Deserialisation of data from untrusted sources MUST NOT execute code as a side effect; native deserialisation of arbitrary objects (e.g., Python `pickle`, PHP `unserialize`, Java `ObjectInputStream`) from external input is forbidden without an integrity-verified allowlist.
- Software updates and auto-update mechanisms MUST verify cryptographic signatures before applying changes; unsigned or unverified updates MUST be rejected.
- CI/CD pipeline definitions MUST NOT fetch external scripts or binaries at runtime without pinned integrity hashes (e.g., `sha256:` digest pinning).
- Data accepted from external APIs MUST be validated against a schema before processing; unvalidated external payloads MUST NOT be passed directly to business logic.
- Serialisation formats used in security-sensitive flows (e.g., JWT, SAML) MUST use a library with known-good algorithm restrictions; `alg: none` and algorithm confusion vulnerabilities MUST be explicitly mitigated.
