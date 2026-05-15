---
schema_version: 1
description: Hexagonal — Adapters implement ports; the inverse is forbidden.
globs: ["**/{infra,infrastructure,adapters}/**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "hexagonal"
concern: "infrastructure-boundary"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (hexagonal) — see ${FRAMEWORK_DOMAIN}. -->

Hexagonal infrastructure-boundary rules.

- Files under `infrastructure/`, `infra/`, or `adapters/` MUST implement a port defined in the domain. They MUST NOT export new abstractions that the domain is expected to depend on.
- Adapter classes/functions MAY import from the domain (to receive port interfaces and entity types). The reverse MUST NOT hold.
- Translation logic (DB row ↔ domain entity, HTTP request ↔ command) MUST live in the adapter, not in the domain.
- Cross-adapter calls (e.g., HTTP adapter calling a DB adapter directly) MUST NOT occur; the application/use-case layer orchestrates between them.
- Framework configuration (route bindings, DB connection strings, queue names) MUST stay inside the adapter module; the domain MUST receive configuration values through a port only.
- Adapter-level error types MUST be caught at the adapter boundary and translated to domain errors before crossing back into the application layer.
