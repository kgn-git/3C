---
schema_version: 1
description: Layered/MVC — Three-layer Presentation → Application → Persistence shape.
globs: ["**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "layered-mvc"
concern: "layer-shape"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (layered-mvc) — see ${FRAMEWORK_DOMAIN}. -->

Layered architecture (Presentation → Application/Service → Persistence).

- The codebase MUST organise into three horizontal layers: **Presentation** (controllers, views, routers), **Application/Service** (business operations), **Persistence** (repositories, DB access).
- Dependencies MUST flow downward only: Presentation MAY call Application; Application MAY call Persistence; the reverse MUST NOT hold.
- Persistence-layer code MUST NOT know about HTTP, controllers, or view templates. If a repository method needs request context, the controller MUST extract it and pass plain values.
- Service-layer code MUST coordinate between Persistence repositories and contain the business logic. It MUST NOT depend on Presentation types (HTTP request/response objects).
- Each layer MAY define its own types; cross-layer data MUST cross via plain DTOs or domain entities, never via framework types (HTTP objects, ORM-attached rows).
- A "shared/common" utility module imported by two non-adjacent layers MUST be examined for layer violations — common utilities MUST be themselves layered or pushed into the deepest consumer.
