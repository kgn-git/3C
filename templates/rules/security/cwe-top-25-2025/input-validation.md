---
schema_version: 1
description: Improper input validation — untrusted input used without type/range/format checks.
globs: ["**/{routes,handlers,controllers,api,forms,validators}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 8
cwe_version: "4.15"
cwe_category: "CWE-20,CWE-1284"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-20 / CWE-1284 — Improper input validation.

- Every external input MUST be validated against an explicit allow-list schema (type, range, length, format) before use; deny-by-default.
- Quantity/index inputs (CWE-1284) MUST be range-checked against documented business limits, not merely parsed.
- Validation MUST happen server-side at the trust boundary; client-side validation MUST NOT be relied upon for security.
- Rejected input MUST fail closed with a generic error; partial/coerced acceptance of malformed input MUST NOT occur.
- Validated values SHOULD be carried in typed structures so downstream code cannot re-introduce the raw input.
