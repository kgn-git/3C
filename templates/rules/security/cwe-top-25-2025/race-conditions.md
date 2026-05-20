---
schema_version: 1
description: Race conditions and TOCTOU — unsynchronised access to shared state or check-then-use gaps.
globs: ["**/{workers,jobs,concurrency,fs,auth,payments}/**/*.{ts,js,py,go,rb,php,java,c,cc,cpp,rs}"]
priority: 7
cwe_version: "4.15"
cwe_category: "CWE-362,CWE-367"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-362 / CWE-367 — Race conditions & TOCTOU.

- Shared mutable state reached concurrently (CWE-362) MUST be protected by an appropriate synchronisation primitive or made immutable; "usually fast enough" is not a guarantee.
- Security-relevant check-then-act sequences (CWE-367) MUST be atomic — re-validate at the point of use, or use an atomic operation, rather than trusting an earlier check.
- Filesystem and resource access MUST avoid TOCTOU by operating on a handle/fd opened once, not by re-resolving a path between check and use.
- Idempotency/locking MUST guard externally triggered state transitions (e.g. payment, provisioning) against concurrent duplication.
