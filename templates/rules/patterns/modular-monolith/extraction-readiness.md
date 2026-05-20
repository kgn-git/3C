---
schema_version: 1
description: Modular monolith — keep modules extractable into services later.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 8
pattern: "modular-monolith"
concern: "extraction-readiness"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (modular-monolith) — see ${FRAMEWORK_DOMAIN}. -->

Future extraction readiness — the seam stays visible.

- A module's public interface SHOULD be shaped as if it were a remote call: coarse-grained, serialisable inputs/outputs, no shared object references across the boundary.
- Cross-module calls SHOULD assume eventual failure — callers SHOULD handle a boundary call not returning, so a later network boundary does not require rework.
- A module SHOULD own its data such that extracting it does not require splitting a shared table.
- Synchronous cross-module chains that would become chatty network calls SHOULD be consolidated now.
- Module boundaries SHOULD align with business capabilities so an extracted service maps to a clear responsibility.
