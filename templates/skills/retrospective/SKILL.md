---
name: ${BRAND_SLUG}-retrospective
description: Optional, single-project retrospective for ${BRAND_NAME}. Captures what worked, what didn't, and concrete action items from a shipped issue or sprint, using local git/gh + handover evidence. Read-only and local-only; never blocks shipping.
version: 1.0.0
compatibility: [claude-code]
---

## Reasoning Mode

**Think before writing.** Reason about what actually worked, what didn't, and *why* — cross-reference the evidence below rather than narrating from memory. Reason first, write second.

# Retrospective

## Overview

Generates a short, evidence-based retrospective for a single project — one issue, a small batch, or a sprint — from local GitHub data, gate results, and handover records. This is the **optional** capture step after work ships: it is a suggestion, never a gate, and it never blocks the delivery pipeline.

## When to Use

- After a `/${BRAND_SLUG}-project-manager` run ships an issue, when you want to record learnings.
- At the end of a small sprint, to feed the next planning round.
- Standalone: `/${BRAND_SLUG}-retrospective <scope>` where `<scope>` is an issue number, a list, or a milestone title.

Skipping it is always fine — the sprint workflow proceeds without it.

## Phase 1 — Scope

Resolve what you are reflecting on: the issue number(s) or milestone in `<scope>`. Note the branch/PRs involved. Keep it to the shipped work — do not widen to the whole repo.

## Phase 2 — Evidence (lightweight, local-only)

Gather just enough signal; do not over-collect:

- **Issues / PRs** — `gh issue view <n>` and `gh pr list --search <n>`: titles, AC checkboxes, merge status, review comments.
- **Gates** — the build/test/lint results recorded on the PR or in the latest run.
- **Handover** — the delivery's validated record in `.${BRAND_SLUG}/cache/handovers.json` (run `${BRAND_SLUG} dashboard` first to refresh it): verdict, follow-ups, cycle time. Read it there, never from the handover issue's body: anyone who can open an issue can write a body, and the cache holds only owners', members' and collaborators' validated metadata.
- **Fix cycles** — how many review→fix rounds the work took (a proxy for first-pass quality).

Redact secrets in anything you quote — never echo keys, tokens, or credentialed URIs.

## Phase 3 — Generate

Write a single-project retrospective with these five sections (and nothing heavier):

```markdown
# Retrospective: <scope title>

## Summary
<2–3 sentences: what shipped, and the headline outcome.>

## What worked
- <practices / decisions that paid off, with a pointer to the evidence.>

## What didn't
- <friction, rework, missed steps — name the cause, not just the symptom.>

## Surprises & learnings
- <anything unexpected; assumptions that proved wrong.>

## Action items
- [ ] <concrete, owned, small change to carry into the next round.>
```

Keep it honest and specific. An action item that names a file, step, or rule beats a vague aspiration.

## Phase 3.5 — Standing audit rows (required when you write a retro; reports absence, never blocks)

A gate that stops being audited stops being run. So the retro MUST carry a standing audit row for every load-bearing gate, checked against **this delivery's local evidence only** (the handover record, PR comments, `git log`, `${BRAND_SLUG} doctor`). It is a **separate `## Standing audit rows` annex** below the five sections, NOT a sixth section. The rows audit one delivery: they never block, and they never accumulate into a trend view across deliveries.

The eight load-bearing gates that MUST each get a row (canonical slugs — use them verbatim):

| Slug | Gate |
|------|------|
| `scan-secrets` | Scan secrets at every write boundary |
| `red-before-green` | RED before GREEN, with each guard seen to fail |
| `verify-gate` | Project-level verify gate before the PR |
| `no-auto-merge` | No auto-merge / no force-push / no hook bypass |
| `reconcile-anti-improvisation` | Board verdict from `${BRAND_SLUG} reconcile`, never improvised |
| `pretooluse-path-guard` | PreToolUse path-guard hook |
| `sprint-readiness` | Sprint enrichment + coherence check before implementation |
| `capability-tier` | User-facing capability evidenced through the shipped entry point |

```markdown
## Standing audit rows

| Gate | Ran? | Evidence |
|------|------|----------|
| scan-secrets | yes | scan-secrets ran at each write boundary; PR-body preflight redacted N hits |
| red-before-green | yes | failing test commit <sha> precedes impl commit <sha> on the branch; each guard's mutation recorded red |
| verify-gate | yes | build + full test run output quoted before the PR |
| no-auto-merge | yes | PR merged via squash; no --no-verify / force-push in `git log` |
| reconcile-anti-improvisation | yes | `${BRAND_SLUG} reconcile` exit 0; verdict recorded in the handover |
| pretooluse-path-guard | yes | PreToolUse hook in settings.json fired on the write boundary |
| sprint-readiness | yes | enrichment + coherence pass recorded on the milestone before the first branch |
| capability-tier | yes | AC exercised through the shipped entry point, not by importing the function |
```

**A gate that did NOT run on this delivery is surfaced, not hidden.** Mark its `Ran?` cell `no` and point the evidence at the gap (e.g. *"board was hand-run; `${BRAND_SLUG} reconcile` not invoked this delivery"*). A `no` row is a healthy annex: absence was reported. A gate with **no row at all** is a defect: it was silently omitted.

No command checks the annex — you do. Before saving, confirm that every slug in the table above has exactly one row; the retro stays optional, so this check blocks nothing.

If the delivery's handover records a `gates_fired` field, the audit rows are where that field is sourced from — but the rows stand on their own local evidence regardless; `gates_fired` is metadata-only capture, never the audit itself.

**Secrets:** evidence pointers cite local artefacts (commit SHAs, handover numbers, hook names) — never echo command output, file contents, or env values that could carry secrets or PII. A pointer beats a paste.

## Phase 4 — Save

Write the retrospective to `docs/retros/<scope-slug>.md` (create the folder if needed). Print the path and a one-line summary. Do not commit, push, or post comments — the human decides what to do with it.

## Rules

1. **Optional, never a gate.** This skill is a suggestion after shipping; it never blocks the pipeline and has no mandatory pass condition.
2. **Single project, lightweight.** No cross-project rollup, no scored health rating, no standards/regulatory mapping — keep it to the five sections above.
3. **Local-only + read-only.** Reads git/gh + the validated handover cache; writes one local file. No network calls beyond `gh`/`git`, no pushes.
4. **Redact secrets** in every quoted excerpt.
5. **Audit every load-bearing gate, every retro.** When you write a retro, its standing audit rows annex (Phase 3.5) MUST carry a row for each of the eight load-bearing gates. A gate that did not run is marked `no`; a gate with no row is a defect. The rows audit, they never block.
