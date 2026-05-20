---
schema_version: 1
description: Cross-site request forgery — state-changing requests without anti-forgery verification.
globs: ["**/{routes,handlers,controllers,api,middleware}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 8
cwe_version: "4.15"
cwe_category: "CWE-352"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-352 — Cross-site request forgery.

- State-changing endpoints MUST verify an anti-CSRF token or an equivalent (double-submit, SameSite cookies plus origin check); cookie-only authentication MUST NOT be sufficient to mutate state.
- Safe methods (GET/HEAD) MUST NOT perform state changes.
- The `Origin`/`Referer` of state-changing requests SHOULD be validated against the expected origin as defence in depth.
- Token verification MUST fail closed: a missing or mismatched token rejects the request.
