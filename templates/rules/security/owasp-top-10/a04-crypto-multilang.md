---
schema_version: 1
description: Cryptographic failure prevention — approved algorithms, key lengths, and transport security across languages.
globs: ["**/*.{py,ts,js,go,java,rb,php}"]
priority: 10
owasp_version: "2025"
owasp_category: "A04:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A04:2025 Cryptographic Failures — see https://owasp.org/Top10/.

Cryptography standards:

- Sensitive data at rest MUST be encrypted using AES-256 or an equivalent approved algorithm; MD5, SHA-1, DES, and RC4 are forbidden for data protection.
- Data in transit MUST use TLS 1.2 at minimum; TLS 1.3 SHOULD be preferred; SSLv2, SSLv3, and TLS 1.0/1.1 are forbidden.
- Passwords and secrets MUST be hashed with a modern adaptive algorithm (bcrypt, Argon2id, or scrypt) with OWASP-recommended cost parameters; plain SHA-family hashing of passwords is forbidden.
- Cryptographic keys MUST be at least 2048 bits for RSA and 256 bits for elliptic-curve algorithms.
- Cryptographic random number generation MUST use a CSPRNG (e.g., `secrets` in Python, `crypto.randomBytes` in Node.js); `Math.random()` and language-level `rand()` are forbidden for security-relevant values.
- Hard-coded cryptographic keys or initialisation vectors MUST NOT appear in source code; keys MUST be loaded from environment variables or a secrets manager.
