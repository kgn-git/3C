---
schema_version: 1
description: Security misconfiguration prevention — hardened defaults for config files, containers, and infrastructure.
globs: ["**/*.{yaml,yml,json,toml,env,dockerfile,Dockerfile}"]
priority: 10
owasp_version: "2025"
owasp_category: "A02:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A02:2025 Security Misconfiguration — see https://owasp.org/Top10/.

Configuration hardening:

- Default credentials MUST be removed or rotated before any deployment; placeholder values such as `password`, `secret`, or `changeme` are forbidden in production config.
- Debug endpoints, stack-trace responses, and verbose error modes MUST be disabled in non-development environments.
- Containers MUST NOT run as root unless the workload explicitly requires it; `privileged: true` requires documented justification.
- Secrets (API keys, tokens, passwords) MUST NOT appear in config files committed to version control; use environment variable injection or a secrets manager.
- Unnecessary ports, services, and features MUST be removed or disabled in container and infrastructure definitions.
- CORS policies MUST specify an explicit allow-list of origins; wildcard `*` is forbidden for credentialled requests.
- Security-relevant HTTP response headers (CSP, HSTS, X-Frame-Options) MUST be present in web-server or reverse-proxy config.
