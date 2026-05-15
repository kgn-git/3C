---
schema_version: 1
description: Exception handling failure prevention — fail-closed error paths and safe error responses without implementation leakage.
globs: ["**/*.{py,ts,js,go,java,rb,php}"]
priority: 10
owasp_version: "2025"
owasp_category: "A10:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A10:2025 Mishandling of Exceptional Conditions — see https://owasp.org/Top10/.

Error and exception handling:

- Error paths MUST fail closed; when an exception or unexpected condition occurs the system MUST deny access or abort the operation rather than fall through to a permissive default.
- Stack traces, internal file paths, database schema details, and framework version strings MUST NOT be included in responses returned to end users.
- Unhandled promise rejections and uncaught exceptions MUST be caught at the application boundary and converted to a generic error response with an opaque correlation ID.
- Every `catch` block or error handler MUST log the full exception detail server-side (with correlation ID) before returning the sanitised response to the caller.
- Error responses MUST use consistent, generic messages (e.g., "An error occurred") regardless of the underlying cause; error discrimination MUST be possible only via the server-side log using the correlation ID.
- Panic/crash recovery in long-running processes MUST restore the system to a known-safe state; partial writes or half-applied transactions MUST be rolled back before resuming.
