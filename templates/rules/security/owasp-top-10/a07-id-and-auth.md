---
schema_version: 1
description: Authentication failure prevention — secure session management, credential storage, and account recovery.
globs: ["**/{auth,login,session,signup,signin}/**/*.{ts,js,py}"]
priority: 10
owasp_version: "2025"
owasp_category: "A07:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A07:2025 Authentication Failures — see https://owasp.org/Top10/.

Authentication and session security:

- Passwords MUST be hashed with bcrypt, Argon2id, or scrypt; plain-text or reversibly encrypted password storage is forbidden.
- Sessions MUST be invalidated immediately on logout and on password or email change; reuse of a pre-change session token after these events is a defect.
- Session tokens MUST be generated with a CSPRNG, be at least 128 bits of entropy, and MUST NOT encode user identity in a reversible or guessable form.
- Authentication endpoints MUST enforce rate limiting and account lockout after a configurable number of failed attempts to prevent credential-stuffing attacks.
- Account recovery flows (password reset, magic links) MUST use single-use, time-limited tokens; tokens MUST be invalidated after first use or expiry.
- Multi-factor authentication MUST be available for any account with elevated privileges or access to sensitive data.
- Authentication failures MUST be logged with timestamp and request metadata; individual failure reasons (wrong password vs. unknown user) MUST NOT be disclosed to the caller.
