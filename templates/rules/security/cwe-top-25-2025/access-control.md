---
schema_version: 1
description: Authorization weaknesses — missing/incorrect authz, missing authentication, privilege management.
globs: ["**/{routes,handlers,controllers,api,middleware,auth}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 10
cwe_version: "4.15"
cwe_category: "CWE-862,CWE-863,CWE-306,CWE-269"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-862 / CWE-863 / CWE-306 / CWE-269 — Authorization & authentication weaknesses.

- Every protected operation MUST perform a server-side authorization check (CWE-862); absence of a check is a defect, not a default-allow.
- Authorization logic MUST verify the authenticated principal against the specific resource and action (CWE-863) — a valid session is not authorization.
- Sensitive/administrative entry points MUST require authentication (CWE-306); "unlinked" or obscure routes are not protected.
- Privilege changes (CWE-269) MUST be explicit, least-privilege, and MUST NOT be derivable from client-controlled fields.
- Authorization MUST be centralised in shared policy/middleware; per-handler duplication that can diverge MUST be avoided.
