---
schema_version: 1
description: Modular monolith — avoid shared mutable state across module boundaries.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 9
pattern: "modular-monolith"
concern: "shared-state"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (modular-monolith) — see ${FRAMEWORK_DOMAIN}. -->

Shared-state avoidance — modules stay independently reasonable.

- Modules MUST NOT communicate through shared mutable globals or singletons; state changes MUST flow through a module's public interface.
- A database schema SHOULD be partitioned by module ownership; a module MUST NOT query or write another module's tables directly.
- Cross-module transactions that span ownership boundaries SHOULD be avoided; prefer per-module consistency with explicit coordination.
- Shared caches keyed across modules SHOULD be namespaced per module so eviction or corruption cannot leak between them.
- In-memory state that two modules both mutate MUST be refactored to a single owner with an explicit accessor.
