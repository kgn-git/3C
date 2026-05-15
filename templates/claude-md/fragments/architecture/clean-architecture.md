The team follows Clean Architecture:

- Source code dependencies MUST point inward, from outer rings toward the core.
- The use-case layer SHOULD NOT import from the framework / I/O layer.
- Entities SHOULD have no knowledge of databases, frameworks, or transport protocols.
- Adapters at the boundary MUST translate between use-case shapes and framework shapes.
- Frameworks (web, ORM, etc.) SHOULD be treated as plug-in details, not the centre.

> Source: Robert C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design* (Prentice Hall, 2017).
