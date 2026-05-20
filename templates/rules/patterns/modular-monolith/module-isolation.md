---
schema_version: 1
description: Modular monolith — modules interact only through explicit public interfaces.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "modular-monolith"
concern: "module-isolation"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (modular-monolith) — see ${FRAMEWORK_DOMAIN}. -->

Module isolation — see "Modular Monolith" (Kamil Grzybek).

- Each module MUST expose a single explicit public interface; other modules MUST import only from that surface, never from a module's internal files.
- A module MUST own its domain types; another module MUST NOT reach into them — exchange data through the public interface or DTOs.
- Cross-module calls SHOULD go through an in-process contract (interface or mediator), keeping a future service extraction seam visible.
- "Utility"/"common" modules imported everywhere SHOULD be split by concern so they do not become a hidden coupling hub.
- Circular dependencies between modules MUST NOT be introduced.
