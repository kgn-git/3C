---
schema_version: 1
description: Hexagonal — Port interfaces in the domain; Adapters at the edge implement them.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "hexagonal"
concern: "ports-adapters"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (hexagonal) — see ${FRAMEWORK_DOMAIN}. -->

Hexagonal (Ports & Adapters) — see Alistair Cockburn, "Hexagonal Architecture" (2005).

- **Ports** MUST be interfaces declared inside the domain — they describe the application's needs in domain language ("`OrderRepository.findByCustomer(...)`"), not infrastructure language ("`select * from orders`").
- **Adapters** MUST implement a port. They live at the application's edge (HTTP, DB, message bus, filesystem) and translate between domain types and external formats.
- A driver/primary adapter (HTTP request, CLI command, scheduled job) MUST drive the application by calling a use case through its port. Use cases MUST NOT know which driver invoked them.
- A driven/secondary adapter (DB, external API client) MUST be invoked by the application through a port. The application MUST NOT import a driven adapter directly.
- New external integrations MUST be added by declaring a new port + adapter; never by importing an external client into use-case code.
- Port interfaces MUST contain no framework or transport types — return values are domain entities or plain DTOs only.
