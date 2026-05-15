---
schema_version: 1
description: Clean Architecture — naming conventions for entities, use cases, gateways, controllers.
globs: ["src/**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "clean-architecture"
concern: "naming"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (clean-architecture) — see ${FRAMEWORK_DOMAIN}. -->

Clean Architecture naming conventions.

- Entity classes/types MUST live under `src/entities/` (or `domain/`) and MUST be named for the business concept (e.g., `Order`, `Customer`) — not for technical details (`OrderEntity`, `OrderRow`).
- Use-case classes/functions MUST live under `src/use-cases/` (or `application/`) and MUST be named for the verb-noun action (`PlaceOrder`, `CalculateInvoice`). One use case per file.
- Gateway interfaces MUST live next to the use case that consumes them; the implementation lives in the adapter layer. Name the interface for the capability (`OrderRepository`), not the technology (`PostgresOrderRepo`).
- Controllers and presenters MUST live under `src/adapters/` (or `interface/`) and MUST be named for the delivery mechanism (`HttpOrderController`, `CliOrderPresenter`).
- Framework-specific code (HTTP servers, DB drivers, message brokers) MUST live under `src/frameworks/` (or `infrastructure/`).
- File names MUST match the primary export's class/function name; one principal export per file.
