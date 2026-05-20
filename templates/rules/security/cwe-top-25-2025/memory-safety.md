---
schema_version: 1
description: Memory-safety weaknesses — out-of-bounds access, use-after-free, integer overflow, NULL deref.
globs: ["**/*.{c,cc,cpp,cxx,h,hpp,rs}"]
priority: 9
cwe_version: "4.15"
cwe_category: "CWE-787,CWE-125,CWE-416,CWE-476,CWE-190"
---

<!-- Generated from ${BRAND_NAME} CWE Top 25 pack — see ${FRAMEWORK_DOMAIN}. -->

CWE-787 / CWE-125 / CWE-416 / CWE-476 / CWE-190 — Memory-safety weaknesses.

- Buffer writes/reads (CWE-787/CWE-125) MUST be bounds-checked against the allocation length; never trust an externally supplied index or length without validation.
- Freed pointers (CWE-416) MUST be set to null after free and MUST NOT be dereferenced; ownership and lifetime MUST be explicit.
- Pointer results that can be null (CWE-476) MUST be checked before dereference.
- Arithmetic on sizes/indices/lengths (CWE-190) MUST use checked or width-safe operations; overflow MUST NOT silently wrap into an allocation or copy size.
- Prefer memory-safe constructs (bounded containers, safe slices, RAII/ownership) over raw pointer arithmetic where the language offers them.
