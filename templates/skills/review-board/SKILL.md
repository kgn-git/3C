---
name: ${BRAND_SLUG}-review-board
description: Convene the ${BRAND_NAME} specialist agents (architecture, security, UX, code, QA) on the current diff in parallel and synthesise one reconciled, cross-checked verdict. Read-only and local-only.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read]
disable-model-invocation: false
---

# /${BRAND_SLUG}-review-board — multi-perspective cross-check

Convene the ${BRAND_NAME} specialist subagents on a change, in **parallel**, and reconcile their findings
into one verdict. This skill is **read-only**: it MUST NOT modify any file, open a PR, push, or call any
network primitive. It runs entirely locally.

The user invokes it as `/${BRAND_SLUG}-review-board [--base=<ref>] [--agents=<list>]`. Parse `--base` (default
`main`, 3-dot branch-relative) and an optional comma-separated `--agents` override from the arguments.

## 1. Resolve the diff

Determine the changed files and diff against `--base` (reuse the same logic as `/${BRAND_SLUG}-review`):
`git diff --name-only <base>...HEAD` for the file list, and the unified diff for content.

## 2. Select the board

Default members (each a shipped subagent, dispatched by `name`):

- `${BRAND_SLUG}-code-reviewer` — quality / correctness
- `${BRAND_SLUG}-architect` — dependency-direction / boundaries
- `${BRAND_SLUG}-security-reviewer` — OWASP / CWE
- `${BRAND_SLUG}-qa-reviewer` — coverage / edge cases / test quality

Auto-add `${BRAND_SLUG}-ux-expert` when the diff touches UI files (`*.tsx`, `*.jsx`, `*.vue`, `*.svelte`,
`*.astro`, `*.css`, `*.html`, or anything under `components/` / `pages/`). Add `${BRAND_SLUG}-product-owner`
when an issue/AC context is supplied. An explicit `--agents` list overrides the defaults.

## 3. Dispatch in parallel

Dispatch the selected agents via the Task tool **in parallel** — issue one Task call per agent in a single
turn so they run concurrently, each in its own fresh context. Give each agent the diff (and the changed-file
list) and instruct it to return its findings as the shared schema (a fenced `json` array of
`{ severity, category, message, file?, line?, suggestion? }`). Agents are read-only — they cannot nest
further subagents.

If an agent fails or returns nothing parseable, note it ("`<agent>` unavailable") and continue with the rest
— a degraded board is better than a blocked one.

## 4. Reconcile

Assemble the collected findings into a `{ "<agent-name>": [ ...findings ] }` JSON object and pipe it to the
shipped reconciler, which de-dupes, merges cross-agent agreement, ranks, flags conflicts, and computes the
verdict:

```bash
echo '<assembled-json>' | ${FRAMEWORK_SLUG} reconcile
```

(or write it to a temp file and pass `${FRAMEWORK_SLUG} reconcile --file <path>`).

**If `${FRAMEWORK_SLUG} reconcile` fails with `Unknown command` or a non-zero exit, STOP.** Your installed
`${FRAMEWORK_SLUG}` CLI predates the reconciler — the binary on PATH is older than these skills. Do **not**
hand-write or improvise a verdict and present it as the deterministic board result. Tell the user to upgrade
the CLI from your framework's distribution and re-run, then verify with
`${FRAMEWORK_SLUG} doctor` (check for a stale shadowing copy via `Get-Command ${FRAMEWORK_SLUG}` / `which ${FRAMEWORK_SLUG}`).

## 5. Emit the board report

Print the reconciler's board report verbatim, prefixed with the board membership and `--base`. **Redact
secrets** in anything you echo from the diff or findings — never emit raw `AKIA…` keys, GitHub PATs, database
URIs with credentials, or production hosts (mirror `/${BRAND_SLUG}-review`'s redaction). The skill does not
write files, post comments, push, or call the network; if the user wants the report on a PR, they paste it.

## Notes

- This is an **orchestrator skill** running in the main thread; the specialists are one level deep. No
  subagent spawns a subagent.
- The reconciliation is deterministic (the shipped `${FRAMEWORK_SLUG} reconcile` CLI), not prose — so the
  verdict is reproducible.
