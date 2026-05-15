---
schema_version: 1
description: Broken access control prevention — server-side authorisation enforcement on every request boundary.
globs: ["**/{routes,handlers,controllers,api,middleware}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 10
owasp_version: "2025"
owasp_category: "A01:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A01:2025 Broken Access Control — see https://owasp.org/Top10/.

Request authorisation:

- Every route and handler MUST enforce authorisation server-side; client-supplied role or permission claims MUST NOT be trusted without server-side verification.
- Access control decisions MUST deny by default; explicit allow-listing is required.
- Object-level authorisation MUST verify that the authenticated principal owns or has permission for the requested resource, not merely that a valid session exists.
- Administrative or privileged endpoints MUST NOT be reachable without an explicit privilege check — obscure paths are not access control.
- Authorisation logic MUST NOT be duplicated across handlers; shared middleware or policy objects MUST be used to prevent divergence.
- Directory traversal characters (`../`, `%2e%2e`) in file-serving paths MUST be rejected before any filesystem access.
- Access control failures MUST be logged with principal identity, resource, and timestamp.
