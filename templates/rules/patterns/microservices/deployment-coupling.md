---
schema_version: 1
description: Microservices — avoid deployment and runtime coupling between services.
globs: ["**/{deploy,infra,k8s,helm,ci}/**/*.{yaml,yml,tf,json,ts,js}"]
priority: 8
pattern: "microservices"
concern: "deployment-coupling"
---

<!-- Generated from ${BRAND_NAME} Architecture Patterns pack (microservices) — see ${FRAMEWORK_DOMAIN}. -->

Deployment-coupling avoidance — independence at runtime.

- A service MUST NOT require a specific deploy order relative to another; startup MUST tolerate dependencies being temporarily unavailable.
- A service MUST degrade or fail gracefully when a downstream dependency is down; an unavailable dependency MUST NOT cascade into total failure (use timeouts, circuit breakers, fallbacks).
- Shared databases or shared message schemas that force coordinated releases SHOULD be eliminated.
- Configuration and secrets MUST be per-service; a global config change SHOULD NOT force redeploying every service.
- A service SHOULD be independently rollback-able without reverting unrelated services.
