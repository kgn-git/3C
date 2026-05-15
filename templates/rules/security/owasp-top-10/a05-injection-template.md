---
schema_version: 1
description: Template/XSS injection prevention — output encoding and safe rendering for web and server-side templates.
globs: ["**/*.{ts,js,jsx,tsx,vue,svelte,py,rb,html,jinja,erb}"]
priority: 10
owasp_version: "2025"
owasp_category: "A05:2025"
---

<!-- Generated from ${BRAND_NAME} OWASP Top 10:2025 pack — see ${FRAMEWORK_DOMAIN}. -->

A05:2025 Injection (template/XSS) — see https://owasp.org/Top10/.

Template and output rendering:

- User-supplied data MUST be HTML-encoded before insertion into HTML context; raw/unescaped interpolation (`dangerouslySetInnerHTML`, `| safe`, `raw()`, `html_safe`) requires explicit security review and documented justification.
- JavaScript event handlers and `<script>` blocks MUST NOT embed unsanitised user input directly.
- Content Security Policy MUST be enforced via HTTP headers to restrict permitted script sources; `unsafe-inline` and `unsafe-eval` SHOULD be avoided.
- Server-side template engines MUST NOT evaluate user-supplied template expressions (e.g., `{{user_input}}` in Jinja2/Twig/ERB auto-eval contexts).
- URLs constructed from user input for `href`, `src`, or `action` attributes MUST be validated against an allowlist of permitted schemes (`https`, `mailto`); `javascript:` and `data:` schemes are forbidden.
- `document.write()` and `innerHTML` assignments from user-controlled data are forbidden; use `textContent` or framework-managed rendering instead.
