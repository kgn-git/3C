---
schema_version: 1
description: Clean Architecture — Dependency Rule. Source-code dependencies point inward only.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "clean-architecture"
concern: "dependencies"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (clean-architecture) — see ${FRAMEWORK_DOMAIN}. -->

The Dependency Rule — see "Clean Architecture" (Robert C. Martin, 2017).

- Source-code dependencies MUST point inward only: outer layers MAY depend on inner layers; inner layers MUST NOT depend on outer layers.
- Entities MUST NOT import from use-case, adapter, or framework layers.
- Use cases MUST NOT import from adapter or framework layers; they depend on entities only.
- Adapters MAY import from use cases and entities; they MUST NOT import from framework code outside their own adapter module.
- Crossing the boundary inward MUST happen via dependency inversion — define an interface (port) in the inner layer; have the outer layer implement it.
- Data structures crossing layer boundaries MUST be plain data — no framework types, no ORM-attached objects, no HTTP request objects.
- Naming or directory structure that hides inward-pointing dependencies (e.g., a "common" module imported everywhere) MUST be refactored to expose the real dependency direction.
