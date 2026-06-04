---
name: ${BRAND_SLUG}-project-manager
description: Single-project delivery pipeline for ${BRAND_NAME}. Sequences product-owner scope-check, TDD implementation, and the review board, with confirmation before every external step. Never auto-merges, force-pushes, or bypasses hooks.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read, Write]
disable-model-invocation: true
---

# /${BRAND_SLUG}-project-manager — checkpointed delivery pipeline

Drive one issue from scope to a reviewed, shippable change by coordinating the ${BRAND_NAME} crew. This skill
is **explicit-invocation only** (`disable-model-invocation: true`); never auto-run. The user invokes it as
`/${BRAND_SLUG}-project-manager <issue-id>`.

It composes the existing atomic skills and the specialist agents — it does **not** replace
`/${BRAND_SLUG}-implement`, `/${BRAND_SLUG}-review`, or `/${BRAND_SLUG}-test`.

## Stages

### 1. Plan + scope (auto)
Fetch the issue and its acceptance criteria. Dispatch the `${BRAND_SLUG}-product-owner` subagent for a
scope / AC pre-check on the issue. Present a short plan (AC → tasks). If the product-owner flags the issue
itself as out-of-scope or unclear, stop and surface it — do not implement against an unclear spec.

### 2. Implement — TDD (auto)
Run the `/${BRAND_SLUG}-implement` workflow as the implementation stage (RED → GREEN, per its own rules).
Do not duplicate its logic; follow it.

### 3. Cross-check (auto)
Run the `${BRAND_SLUG}-review-board` procedure on the resulting diff: dispatch the specialist agents in
parallel and reconcile via `${FRAMEWORK_SLUG} reconcile` into one verdict. **If `${FRAMEWORK_SLUG} reconcile`
fails with `Unknown command` or a non-zero exit, STOP** — the installed CLI predates the reconciler. Do not
improvise a verdict; tell the user to upgrade/reinstall the CLI
(`npm install -g git+https://github.com/kgn-git/3C#v<latest>`, then `${FRAMEWORK_SLUG} doctor`).

### 4. Reconcile + decide (auto)
- `clean` / `advisory` → proceed to ship.
- `blocking` → run **one** bounded fix cycle (return to stage 2 for the flagged items), then re-run the
  board. If it is still blocking after that single cycle, **stop and hand off to a human** with the board
  report. Never loop unbounded; never silently proceed past a blocking verdict.

### 5. Ship (checkpoint)
- **Confirm with the user before** creating a branch and **before** opening a PR. These are the external,
  hard-to-reverse steps.
- **Never** auto-merge, **never** force-push, **never** bypass hooks (`--no-verify`) or the pre-commit gate.
- Write a handover-style summary (what changed, the board verdict, any needs-human items, follow-ups).

### 6. Retrospective (optional)
After shipping, **optionally** capture a retrospective: `/${BRAND_SLUG}-retrospective <scope>`. This is a
suggestion only — it is **not** a gate, has no pass condition, and never blocks the pipeline. Skip it freely;
the single-issue flow is complete at stage 5 whether or not a retro is run.

## Guardrails

Inherit `/${BRAND_SLUG}-implement`'s controls verbatim — confirmation before external-state changes, no
auto-merge, no force-push, no hook bypass. The pipeline only *adds* the product-owner pre-check, the
multi-perspective board, and the bounded decide-loop on top. It is an orchestrator skill in the main thread;
the agents it dispatches are one level deep and never spawn further subagents.
