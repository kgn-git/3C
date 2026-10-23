---
schema_version: 1
description: Test layering — pin each rule once, at the lowest layer that owns it; upper layers test only that they are wired to it.
globs: ["**/*.{test,spec}.*", "**/{test,tests,__tests__,spec}/**"]
load: disk
---

<!-- Generated from ${BRAND_NAME} quality pack — see ${FRAMEWORK_DOMAIN}. -->

Test layering: where a rule is pinned.

- A rule MUST be pinned once, at the lowest layer that owns it: a domain rule in the domain test, a parsing rule in the wire or parser test, an access rule in the server-boundary test.
- An upper layer (route, form, page, command) MUST test only that it is wired to the layer below, through one path; it MUST NOT repeat the rule's cases.
- A rule MUST NOT be re-pinned at every layer it passes through. Each copy is another place to update when the rule changes, and none adds a guarantee.
- Every fixed defect MUST get a test at the layer where the defect lived, not the layer where it was seen.
- A pin MAY be removed only when the change that removes it names the test that still holds the rule.
