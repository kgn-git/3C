---
schema_version: 1
description: Hexagonal — Domain code MUST NOT import from infrastructure or adapter modules.
globs: ["**/{domain,core,model}/**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "hexagonal"
concern: "domain-isolation"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (hexagonal) — see ${FRAMEWORK_DOMAIN}. -->

Hexagonal domain-isolation rules.

- Files under `domain/`, `core/`, or `model/` MUST NOT import from `infrastructure/`, `adapters/`, or any framework module (HTTP, DB, message bus, telemetry).
- Domain types MUST NOT carry ORM annotations, HTTP decorators, or serialisation metadata. If persistence requires extra metadata, define a separate row/DTO type in the adapter layer.
- Domain functions MUST be pure where practical — no global state, no system clock reads, no random sources. Side effects come in via injected ports.
- Domain validation rules MUST be expressed in domain code, not in adapter-layer schemas. Adapter-layer schema validation (Joi, Zod, Pydantic) MAY validate transport shape but MUST NOT replace domain invariants.
- Configuration values MUST enter the domain through a port (e.g., `ConfigPort.featureFlag(...)`) rather than via direct `process.env` / system reads in domain code.
