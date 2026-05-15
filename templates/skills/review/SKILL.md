---
name: review
description: Apply a team-specific static review checklist to the current branch's diff against main. Read-only, local-only — produces structured findings with file/line, severity, and suggested-fix text. Never modifies files; never sends data externally.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read]
disable-model-invocation: false
---

# /${BRAND_SLUG}:review — Pre-PR review against ${BRAND_NAME} standards

When the user asks for a code review (or invokes this skill directly), follow this exact workflow. This skill is **read-only**: it MUST NOT modify any file, MUST NOT invoke `gh pr comment` / `gh api` / `git push` / any network primitive, and MUST NOT echo real-looking credentials.

## 1. Resolve the diff

The user invokes this skill as `/${BRAND_SLUG}:review [--base=<ref>]`. Parse `--base` from the invocation arguments if present; otherwise default to `main` (3-dot, branch-relative).

Run:

```bash
git diff <base>...HEAD --name-only
```

If the output is empty, print "No changes versus `<base>` — are you on a feature branch?" and stop cleanly. If `git` errors (no such ref, detached HEAD, not a git repo), surface the error verbatim and stop.

## 2. Load the per-file diffs

For each file listed in step 1, fetch the diff and read the post-image so you can cite line numbers:

```bash
git diff <base>...HEAD -- <file>
```

After fetching the diff, use the **Read tool** (not Bash) to load the post-image file so line numbers in your findings reflect the current file state.

If a file was deleted, you have only the pre-image — limit findings to facts visible in the diff.

## 3. Load the team's checklist + rules

- Use the **Read tool** to load `.claude/skills/review/checklist.md` now. (It is NOT pre-loaded into context — you must Read it at runtime.)
- Rules from `.claude/rules/**/*.md` were auto-loaded into your session context by `${FRAMEWORK_SLUG} rules apply`. You do NOT need to re-load them — consult them from memory.
- If the team has installed the OWASP pack (`.claude/rules/security/owasp-top-10/*.md`) or pattern packs (`.claude/rules/patterns/<name>/*.md`), they are part of your context. Cite the source rule file path when a finding maps to one (AC8).

## 4. Apply the checklist per file

For each changed file, walk the four checklist anchors in order — **Code Quality**, **Security**, **Testing**, **Architecture** — and emit a finding for each issue you see. A finding MUST include:

- `file` (relative path)
- `line` or `line range` (from the post-image you read in step 2)
- `severity` — one of `critical` (security or correctness — must fix), `major` (significant quality issue), `minor` (style or idiom), `suggestion` (optional improvement)
- `description` — what's wrong, in one or two sentences
- `suggested fix` — the change you'd make, as **text**. Do NOT apply it. If the finding maps to an installed rule, cite the rule's path inline (e.g., "See `.claude/rules/security/owasp-top-10/a05-injection-sql.md`").

## 5. Redact credentials before emission (mandatory)

Before writing any finding to the output, run its `description` and `suggested fix` text through:

```bash
${FRAMEWORK_SLUG} scan-secrets <<'SCAN_INPUT_EOF'
<finding text>
SCAN_INPUT_EOF
```

The single-quoted heredoc delimiter (`'SCAN_INPUT_EOF'`) suppresses shell expansion, so a finding containing `$`, backticks, or quotes is passed through unchanged.

The command emits JSON on stdout: `{"hits":[{"type":"<type>","match":"<raw>","redacted":"<masked>"}, ...]}`. For each hit, replace the `match` substring with the `redacted` value in the text you emit. The original diff is unchanged — this redaction applies **only** to what you write into the review output. Never emit raw `AKIA…` keys, raw GitHub PATs, real database URIs with credentials, or production IPs/hostnames.

If `scan-secrets` returns an empty `hits` array, emit the finding verbatim.

## 6. Render the output

Structure as Markdown, grouped by file. Within each file, sort findings by severity in this order: `critical` → `major` → `minor` → `suggestion`. End with a summary table of totals.

Resolve `<branch>` via `git rev-parse --abbrev-ref HEAD` and `<base>` from Step 1 before rendering. Substitute them inline into the header.

```markdown
# ${BRAND_NAME} review — <branch> vs <base>

## src/auth/login.ts

### critical — line 42: SQL string concatenation

User input flows directly into the SQL string; an attacker can break out of the query.

**Suggested fix:** use a parameterised query. See `.claude/rules/security/owasp-top-10/a05-injection-sql.md`.

### minor — line 17: missing JSDoc

…

## tests/auth/login.test.ts

…

---

## Summary

| Severity | Count |
|----------|-------|
| critical | 1 |
| major | 0 |
| minor | 3 |
| suggestion | 2 |
```

## 7. Stop. Do not act.

The review ends with the rendered Markdown. The skill does NOT modify any file, post any comment, push any commit, or call any network endpoint. If the user wants the review on their PR, they will paste it themselves.

## What this skill does NOT do (deferred to L2)

- `--fix` auto-apply of suggestions → spawned VP-02-F03-ext (L2 P2).
- `--post` to GitHub/GitLab as PR comments → [#70 multi-PM L2 P2](https://github.com/kgn-git/praise/issues/70).
- `--ignore <finding-id>` persistent suppression → spawned VP-02-F03-ext (L2 P2).
- Performance / N+1 / runtime analysis in the default checklist → [#18 Security Scan Gate L2 P1](https://github.com/kgn-git/praise/issues/18).
- Drift / trend analysis across reviews → [#10 Standards Drift Detector L2 P2](https://github.com/kgn-git/praise/issues/10).

## Subagent dispatch (since #51)

When this skill dispatches the `${BRAND_SLUG}-code-reviewer` subagent for a long-context diff scan, the invocation transcript is written by Claude Code to:

```
~/.claude/projects/<project>/<sessionId>/subagents/agent-<id>.jsonl
```

This file is plain append-only JSONL at L1 — the schema is forward-compatible with the L3 HMAC chain + escrow signing (VP-05-F01) without breaking re-emit. The agent itself runs read-only (`tools: [Read, Grep, Glob]`) and cannot reach the network. The PreToolUse path-guard (`src/cli/hook-path-guard.ts`, registered via `.claude-plugin/plugin.json`) blocks any attempt to read `.env*`, `~/.ssh/`, or `~/.aws/`.
