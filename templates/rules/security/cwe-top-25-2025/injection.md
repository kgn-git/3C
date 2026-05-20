---
schema_version: 1
description: Injection weaknesses — untrusted data reaching an interpreter (SQL, OS command, code, XSS).
globs: ["**/{routes,handlers,controllers,api,db,repositories,views,templates}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 10
cwe_version: "4.15"
cwe_category: "CWE-89,CWE-78,CWE-79,CWE-94"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-89 / CWE-78 / CWE-79 / CWE-94 — Injection weaknesses.

- SQL access (CWE-89) MUST use parameterised queries or a vetted query builder; string-concatenated SQL with any external input MUST NOT be emitted.
- OS interaction (CWE-78) MUST avoid shell interpolation; pass argument vectors to exec APIs, never a composed shell string with external input.
- Browser output (CWE-79) MUST be contextually escaped/encoded at render; raw HTML sinks (`innerHTML`, `dangerouslySetInnerHTML`) MUST NOT receive unsanitised input.
- Dynamic code (CWE-94) — `eval`, `Function`, dynamic `import()` of computed strings, or template engines with code execution MUST NOT take untrusted input.
- All four MUST treat data crossing a trust boundary as untrusted regardless of prior validation elsewhere.
