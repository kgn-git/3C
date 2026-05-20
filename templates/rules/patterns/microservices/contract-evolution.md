---
schema_version: 1
description: Microservices — backward-compatible contract evolution between independently deployed services.
globs: ["**/{api,proto,schema,contracts,events}/**/*.{ts,js,py,go,java,rb,php,proto,json,yaml,yml}"]
priority: 9
pattern: "microservices"
concern: "contract-evolution"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (microservices) — see ${FRAMEWORK_DOMAIN}. -->

Contract evolution — independent deployability.

- Contract changes MUST be backward compatible within a major version: fields MAY be added; existing fields MUST NOT be removed or repurposed without a new version.
- Consumers MUST tolerate unknown fields and MUST NOT break on additive changes.
- A breaking change MUST ship as a new explicitly-versioned contract; the old version MUST remain until consumers have migrated.
- Producers and consumers MUST be deployable independently — a change MUST NOT require lock-step deployment of both.
- Event payloads SHOULD carry a schema version; consumers SHOULD validate against the version they expect.
