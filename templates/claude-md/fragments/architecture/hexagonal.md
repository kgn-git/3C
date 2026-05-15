The team follows Hexagonal Architecture (Ports & Adapters):

- The application core SHOULD be testable without any external dependencies.
- All I/O (databases, HTTP, message queues) MUST cross the boundary through ports (interfaces) and adapters (implementations).
- Driver-side adapters (incoming requests) and driven-side adapters (outgoing calls) MUST be visibly distinguished in the codebase.
- Ports SHOULD be defined in domain language; adapters translate to/from technical concerns.

> Source: Alistair Cockburn, *Hexagonal Architecture* — https://alistair.cockburn.us/hexagonal-architecture/ (2005).
