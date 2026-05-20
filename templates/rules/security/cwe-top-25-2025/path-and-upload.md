---
schema_version: 1
description: Path traversal and unrestricted file upload — untrusted paths/filenames reaching the filesystem.
globs: ["**/{files,upload,storage,fs,assets,download}/**/*.{ts,js,py,go,rb,php,java}"]
priority: 9
cwe_version: "4.15"
cwe_category: "CWE-22,CWE-434"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-22 / CWE-434 — Path traversal & unrestricted upload.

- Filesystem paths built from input (CWE-22) MUST be resolved and confirmed to stay within an allowed base directory; `..`, absolute paths, and symlink escape MUST be rejected.
- A canonicalised-path containment check MUST be applied after resolution, not a substring/blacklist filter before it.
- Uploaded files (CWE-434) MUST be validated by enforced type/size and stored outside any executable/served path; the client-supplied filename and content-type MUST NOT be trusted.
- Executable interpretation of uploaded content MUST be impossible by storage location and server config.
- User-controlled filenames SHOULD be replaced with server-generated identifiers.
