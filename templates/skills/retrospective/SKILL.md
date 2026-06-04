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

Generates a short, evidence-based retrospective for a single project — one issue, a small batch, or a sprint — from local GitHub data, gate results, and handover files. This is the **optional** capture step after work ships: it is a suggestion, never a gate, and it never blocks the delivery pipeline.

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
- **Handover** — the `docs/Handover-N.md` for the shipped work: what changed, follow-ups, notes.
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

## Phase 4 — Save

Write the retrospective to `docs/retros/<scope-slug>.md` (create the folder if needed). Print the path and a one-line summary. Do not commit, push, or post comments — the human decides what to do with it.

## Rules

1. **Optional, never a gate.** This skill is a suggestion after shipping; it never blocks the pipeline and has no mandatory pass condition.
2. **Single project, lightweight.** No cross-project rollup, no scored health rating, no standards/regulatory mapping — keep it to the five sections above.
3. **Local-only + read-only.** Reads git/gh + handovers; writes one local file. No network calls beyond `gh`/`git`, no pushes.
4. **Redact secrets** in every quoted excerpt.
