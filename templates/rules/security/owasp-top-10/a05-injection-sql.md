---
schema_version: 1
description: SQL injection prevention — parameterised queries and least-privilege DB access.
globs: ["**/*.{sql,py,ts,js,go,rb,php,java}"]
priority: 10
owasp_version: "2025"
owasp_category: "A05:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A05:2025 Injection — see https://owasp.org/Top10/.

Database access:

- Database queries MUST use parameterised statements; string concatenation of user input into SQL is forbidden.
- ORM `.raw()` / `.literal()` escapes MUST NOT splice unsanitised user input.
- Stored procedures MUST validate input types and lengths before use.
- Database accounts used by the application MUST have the minimum privileges required (no `DROP`, no `GRANT`).
- Errors from the database driver MUST NOT be surfaced verbatim to end users (they reveal schema).
