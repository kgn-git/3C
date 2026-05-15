The team applies Domain-Driven Design:

- Identifiers and naming in code MUST mirror the ubiquitous language used by domain experts.
- Aggregates MUST enforce their own invariants; cross-aggregate consistency SHOULD be eventual (via domain events).
- Bounded contexts SHOULD be explicit; integrations between contexts MUST go through anti-corruption layers or shared kernels.
- Domain logic MUST live in domain entities and value objects, not in services or controllers.

> Source: Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* (Addison-Wesley, 2003).
