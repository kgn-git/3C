---
schema_version: 1
description: Unsafe deserialization and uncontrolled resource consumption.
globs: ["**/{api,handlers,workers,queue,parsers,serializers}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 8
cwe_version: "4.15"
cwe_category: "CWE-502,CWE-400,CWE-770"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-502 / CWE-400 / CWE-770 — Deserialization & resource exhaustion.

- Deserialization of untrusted data (CWE-502) MUST use a safe, schema-validated format; native/object deserializers that can instantiate arbitrary types MUST NOT be applied to external input.
- Operations whose work scales with input (CWE-400) MUST enforce explicit bounds: payload size, collection length, recursion depth, regex complexity, and timeouts.
- Resource acquisition (CWE-770) MUST be bounded and released — connection/handle/memory pools MUST have caps and the release path MUST run on every exit.
- Unbounded retries or fan-out driven by external input MUST NOT be emitted.
