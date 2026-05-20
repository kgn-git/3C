---
schema_version: 1
description: Microservices — service boundaries own their data and are reached only via their contract.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "microservices"
concern: "service-boundaries"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (microservices) — see ${FRAMEWORK_DOMAIN}. -->

Service boundaries — see "Building Microservices" (Sam Newman).

- A service MUST own its data store; other services MUST NOT read or write it directly. Cross-service data access MUST go through the owning service's API.
- A service MUST be reachable only via its published contract (API/events); in-process imports of another service's internals MUST NOT occur.
- Shared mutable libraries that couple services to a common schema SHOULD be avoided; share contracts, not implementations.
- A boundary SHOULD map to a business capability, not a technical layer.
- Synchronous call chains across many services SHOULD be avoided; prefer asynchronous events or a single composition point.
