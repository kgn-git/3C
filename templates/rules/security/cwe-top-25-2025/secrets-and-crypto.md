---
schema_version: 1
description: Hard-coded credentials and weak cryptography — secrets in code, broken or misused crypto.
globs: ["**/*.{ts,js,py,go,rb,php,java,env,yaml,yml,json}"]
priority: 9
cwe_version: "4.15"
cwe_category: "CWE-798,CWE-327,CWE-256"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-798 / CWE-327 / CWE-256 — Credentials & cryptography weaknesses.

- Credentials, API keys, tokens, and private keys (CWE-798) MUST NOT be embedded in source, config, or fixtures; they MUST come from the OS keychain or an injected secret store.
- Cryptographic primitives (CWE-327) MUST be current, vetted algorithms with adequate parameters; MD5/SHA-1 for security, ECB mode, and home-grown crypto MUST NOT be used.
- Secrets at rest (CWE-256) MUST NOT be stored in plaintext; password material MUST use a memory-hard salted KDF (e.g. argon2/bcrypt/scrypt), never a fast or unsalted hash.
- Randomness for security MUST use a CSPRNG, not a general-purpose PRNG.
