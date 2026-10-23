---
schema_version: 1
description: File size and comment discipline — a code-line cap per file, and comments that say why, never what or when.
globs: ["**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rb,java,kt,cs,php,rs,swift,c,cpp,h}"]
load: disk
---

<!-- Generated from ${BRAND_NAME} quality pack — see ${FRAMEWORK_DOMAIN}. -->

File size and comments.

A code line is a line that is neither blank nor comment-only. Test files are `*.test.*` and `*.spec.*` files, and files under a `test` or `tests` directory.

File size:

- A file MUST NOT exceed 500 code lines.
- A file MAY reach 550 code lines only when no behavioural seam exists to split it along, and its header comment MUST say why.
- At 250 code lines a file SHOULD be looked at for a behavioural seam to split along; nothing forces the split. Test files are exempt from this signal, not from the cap.

Comments:

- Self-explanatory code MUST NOT carry a comment.
- A comment MUST say why, never what the code does.
- A comment MUST NOT record development history (what the code used to do, who changed it, which ticket or issue asked for it); version control holds that.
- A comment MUST NOT stand in for a safeguard: a defect is pinned by a test, not by a warning comment.
- A property claim in a comment ("only", "every", "never", "cannot") MUST be derivable from the code or pinned by a test.
- A comment MUST cite symbols, not line numbers; line numbers go stale on the next edit.
- Commented-out code MUST NOT be committed.
- An implementation file MUST NOT carry more comment characters than code characters (a ratio above 1.0). Configuration files are exempt.
- Existing history comments SHOULD be removed in files being edited anyway, never in a dedicated campaign.
