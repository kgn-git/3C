---
schema_version: 1
description: Shell/exec injection prevention — array-form invocation and validated arguments for all process spawning.
globs: ["**/*.{sh,py,ts,js,rb,go}"]
priority: 10
owasp_version: "2025"
owasp_category: "A05:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A05:2025 Injection (shell/exec) — see https://owasp.org/Top10/.

Process and shell invocation:

- All process spawn and shell-exec calls MUST use array-form invocation (e.g., `subprocess.run(["cmd", arg])` in Python, `execFile` in Node.js); composing a single command string from user input is forbidden.
- Shell interpretation (`shell=True` in Python, `{shell: true}` in Node.js) MUST NOT be used when any argument originates from user input.
- Arguments passed to external processes MUST be validated against a strict allowlist of characters or values before use.
- Temporary files created during shell operations MUST use unpredictable names (CSPRNG-based) and be created in restricted-permission directories.
- Environment variables passed to spawned processes MUST be filtered; the full parent environment MUST NOT be inherited without explicit review.
- Output from spawned processes MUST NOT be passed directly to a subsequent shell invocation.
