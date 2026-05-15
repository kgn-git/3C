---
schema_version: 1
description: Software supply chain failure prevention — dependency pinning, integrity verification, and build reproducibility.
globs: ["**/package.json", "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml", "**/requirements.txt", "**/Pipfile", "**/Pipfile.lock", "**/poetry.lock", "**/go.mod", "**/go.sum", "**/Cargo.toml", "**/Cargo.lock", "**/pom.xml", "**/build.gradle", "**/Gemfile", "**/Gemfile.lock", "**/composer.json", "**/composer.lock"]
priority: 10
owasp_version: "2025"
owasp_category: "A03:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A03:2025 Software Supply Chain Failures — see https://owasp.org/Top10/.

Dependency management:

- Third-party dependencies MUST be pinned to exact versions or integrity-verified hashes; floating ranges (`^`, `~`, `>=`) are forbidden in production lock-files.
- Lock-files MUST be committed to version control and kept in sync with the dependency manifest; divergence MUST be treated as a build error.
- Dependencies MUST be sourced from official registries; private mirrors MUST enforce checksum verification against the upstream registry.
- Automated dependency vulnerability scanning MUST run on every CI build; builds with known critical-severity vulnerabilities MUST NOT be promoted to production.
- Transitive dependencies introducing known high-severity vulnerabilities MUST be remediated within the team's defined SLA.
- Build pipelines MUST NOT execute arbitrary scripts fetched from the network at build time without pinned integrity hashes.
