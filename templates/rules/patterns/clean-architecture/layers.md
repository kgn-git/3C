---
schema_version: 1
description: Clean Architecture — the four concentric layers and what belongs in each.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "clean-architecture"
concern: "layers"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (clean-architecture) — see ${FRAMEWORK_DOMAIN}. -->

Clean Architecture — see "Clean Architecture" (Robert C. Martin, 2017).

Code in this repository organises around four concentric layers:

- **Entities** MUST contain enterprise-wide business rules — pure domain types and their invariants. Entities MUST NOT import from any other layer.
- **Use Cases** MUST contain application-specific business rules — they orchestrate entities to satisfy a user-facing operation. Use cases MUST depend only on entities.
- **Interface Adapters** (controllers, presenters, gateways) MUST translate data between the use-case format and external formats (HTTP, DB rows, CLI). They MUST NOT contain business rules.
- **Frameworks & Drivers** (web framework, DB driver, file system) MUST be confined to the outer ring. Application code MUST NOT depend on framework specifics outside this layer.

When in doubt, ask: "Does this rule change if we swap the database?" If yes, the code is in the wrong layer.
