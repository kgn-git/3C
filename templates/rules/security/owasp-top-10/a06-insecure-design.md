---
schema_version: 1
description: Insecure design prevention — threat modelling, deny-by-default, and security requirements for new features.
globs: ["**/*.{py,ts,js,go,java,rb,php}"]
priority: 10
owasp_version: "2025"
owasp_category: "A06:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A06:2025 Insecure Design — see https://owasp.org/Top10/.

Design-level security requirements:

- New features touching authentication, payments, or personal data MUST undergo threat modelling before implementation begins; STRIDE coverage is the minimum expected.
- Access control and trust boundary decisions MUST be made at design time and documented; retrofitting access control after implementation is forbidden.
- Business logic flows MUST account for adversarial inputs and edge cases; rate limiting and abuse-prevention controls MUST be scoped at design time.
- Systems MUST default to the most restrictive behaviour and explicitly relax constraints; permissive-by-default designs require documented justification and security sign-off.
- Sensitive operations (account deletion, privilege escalation, large financial transactions) MUST require a secondary confirmation or step-up authentication step designed into the flow.
- Prototypes and proof-of-concept code MUST NOT reach production without a design review that addresses security properties.
