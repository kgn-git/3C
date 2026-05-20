---
schema_version: 1
description: SSRF and open redirect — server-side requests or redirects driven by untrusted URLs.
globs: ["**/{http,client,fetch,proxy,webhook,routes,handlers}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 9
cwe_version: "4.15"
cwe_category: "CWE-918,CWE-601"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-918 / CWE-601 — SSRF & open redirect.

- Server-initiated requests to a user-supplied URL (CWE-918) MUST validate the target against an allow-list of hosts/schemes; raw user URLs MUST NOT be fetched.
- Requests MUST be blocked from reaching internal/link-local/metadata ranges; DNS-rebinding MUST be mitigated by resolving and pinning the address before connect.
- Redirect targets (CWE-601) MUST be restricted to an allow-list of internal paths or vetted hosts; the raw `next`/`returnUrl` parameter MUST NOT be used directly in a redirect.
- Both MUST fail closed: an untrusted or unresolvable target is rejected, not best-effort followed.
