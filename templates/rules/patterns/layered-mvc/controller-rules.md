---
schema_version: 1
description: Layered/MVC — Controllers stay thin; business logic lives in the service layer.
globs: ["**/{controllers,handlers}/**/*.{ts,js,py,go,java,rb,php}"]
priority: 10
pattern: "layered-mvc"
concern: "controller-rules"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (layered-mvc) — see ${FRAMEWORK_DOMAIN}. -->

Layered/MVC controller responsibility rules.

- Controllers MUST be thin — they extract input from the request, call a service, and format the response. Controllers MUST NOT contain business logic, validation rules, or persistence calls.
- Controllers MUST NOT import from `repositories/`, `persistence/`, or `db/` directly. Persistence access goes through a service.
- Request validation (shape, types, required fields) MAY live at the controller layer via schema/decorator-based validation. Domain validation (business invariants) MUST live in the service layer.
- Authentication/authorisation MUST be enforced at or above the controller — never inside services or repositories. Services receive an already-authenticated principal as a parameter; they MUST NOT call session/JWT APIs themselves.
- Response formatting (JSON shape, status codes, headers) MUST stay in the controller. Services MUST return plain data types, not HTTP responses.
- Controller methods SHOULD NOT exceed ~15 lines of executable code; longer indicates business logic that should move to a service.
