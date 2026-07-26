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
`/${BRAND_SLUG}-project-manager <issue-id>`, or with a milestone subcommand (see "Milestone operations"
below): `/${BRAND_SLUG}-project-manager <plan|enrich|status|sprint-close> [target]`.

It composes the existing atomic skills and the specialist agents — it does **not** replace
`/${BRAND_SLUG}-implement`, `/${BRAND_SLUG}-review`, or `/${BRAND_SLUG}-test`.

## Stages

### 1. Plan + scope (auto)
Fetch the issue and its acceptance criteria. Dispatch two subagents in parallel for the pre-check:
the `${BRAND_SLUG}-product-owner` subagent for a scope / AC pre-check, and the
`${BRAND_SLUG}-journey-architect` subagent for a **reachability** pre-check — whether the change keeps
every customer-facing capability reachable and recoverable, judged from the issue/AC before any code.
Present a short plan (AC → tasks). If the product-owner flags the issue itself as out-of-scope or
unclear — or the journey-architect flags a `blocking` reachability gap — stop and surface it; do not
implement against an unclear or unreachable spec.

### 2. Implement — TDD (auto)
Run the `/${BRAND_SLUG}-implement` workflow as the implementation stage (RED → GREEN, per its own rules).
Do not duplicate its logic; follow it.

### 3. Cross-check (auto)
Run the `${BRAND_SLUG}-review-board` procedure on the resulting diff: dispatch the specialist agents in
parallel and reconcile via `${FRAMEWORK_SLUG} reconcile` into one verdict. **If `${FRAMEWORK_SLUG} reconcile`
fails with `Unknown command` or a non-zero exit, STOP** — the installed CLI predates the reconciler. Do not
improvise a verdict; tell the user to upgrade/reinstall the CLI from your framework's distribution,
then verify with `${FRAMEWORK_SLUG} doctor`.

### 4. Reconcile + decide (auto)
- `clean` / `advisory` → proceed to ship.
- `blocking` → run **one** bounded fix cycle (return to stage 2 for the flagged items), then re-run the
  board. If it is still blocking after that single cycle, **stop and hand off to a human** with the board
  report. Never loop unbounded; never silently proceed past a blocking verdict.

### 5. Ship (checkpoint)
- **Confirm with the user before** creating a branch and **before** opening a PR. These are the external,
  hard-to-reverse steps.
- **Never** auto-merge, **never** force-push, **never** bypass hooks (`--no-verify`) or the pre-commit gate.
- Write the handover document (`docs/Handover-<N>.md`). It MUST open with a `3c-handover/1` YAML
  frontmatter block, computed by the pipeline **at ship time** — this is what the
  `${BRAND_SLUG} dashboard` delivery view reads (it performs no git or network calls, so anything
  missing here renders as a blank):

  ```yaml
  ---
  schema: 3c-handover/1
  issue: <N>                  # or `issues: [..]` when one delivery closes several
  title: "<issue title>"
  pr: <PR number>
  merge_sha: <short sha>
  branch: <feature branch>
  started: <first branch commit, ISO-8601 UTC>
  merged: <merge timestamp, ISO-8601 UTC>
  verdict: { level: <clean|advisory|blocking>, blocking: 0, warnings: 0, suggestions: 0, fixed_in_branch: 0 }   # from the board
  tests_total: <suite size at merge>
  loc: { added: 0, removed: 0, files: 0 }   # from the merge diff shortstat
  follow_ups: []              # issue numbers filed during this delivery
  ---
  ```

- The frontmatter carries delivery metadata only — it MUST NOT embed credentials, tokens, or any
  secret material (same discipline as the scan-secrets pass on plan and PR text; handovers are
  committed files).
- Below the frontmatter, the narrative stays human-first: what changed, the board verdict, any
  needs-human items, follow-ups.

### 6. Retrospective (optional)
After shipping, **optionally** capture a retrospective: `/${BRAND_SLUG}-retrospective <scope>`. This is a
suggestion only — it is **not** a gate, has no pass condition, and never blocks the pipeline. Skip it freely;
the single-issue flow is complete at stage 5 whether or not a retro is run.

## Milestone operations

Sprint-level coordination for the team's issue tracker, alongside the per-issue pipeline above. The
target repository is whatever the current checkout's tracker is — never hard-code one.

### plan "<milestone>" / enrich #<issue>

1. **Fetch** — `gh issue list --milestone "<name>" --state open --json number,title,body,labels`
   (zero issues → verify the milestone name via the tracker API; an issue with no body → flag and skip).
2. **Triage each issue to advisory lenses** — dispatch the crew agents, one level deep:
   - Scope, priority, or maturity alignment → `${BRAND_SLUG}-product-owner` agent (**always first** — if it
     flags the scope as unclear or the maturity level wrong, halt the remaining lenses for that issue).
   - Architecture, component boundaries → `${BRAND_SLUG}-architect` agent.
   - Trust boundaries, secrets, sandboxing → `${BRAND_SLUG}-security-reviewer` agent.
3. **Synthesize** the lens outputs into a structured issue body:

   ```markdown
   ## Feature: <id> — <Name>            <maturity level | priority>
   ## Description / ## User Story
   ## Technical Approach                <component ownership, decisions referenced>
   ## Scope Boundary                    <in scope / explicitly out>
   ## Dependencies                      <must exist first>
   ## Acceptance Criteria               <- [ ] AC1 … testable actions>
   ## Lens Assessments                  <details-collapsed agent outputs>
   ```

4. **Self-critique before updating the tracker:** ACs are testable actions, not observations; no
   higher-maturity work crept into a lower-level issue; a developer could build this without
   clarification; dependencies are real; target 30–50% shorter than the first draft.
5. **Update** — `gh issue edit <n> --body …`. If the existing body already has structured content,
   present a diff before overwriting.

### status / sprint-close "<milestone>"

Produce the sprint summary: a table (issue / priority / lens reviews / status), flags (dependency
risks, architecture concerns, cross-cutting dependencies), and health counts (ready for development /
needs clarification / needs split).

### Process rules

1. **Maturity discipline** — work needing higher-level infrastructure never enters a lower-level milestone.
2. **Dependency ordering** — foundation features before their dependents.
3. **Single responsibility** — titles joining distinct features with "and"/"+" are split.
4. Large milestones (5+ issues) — process in batches.

## Guardrails

Inherit `/${BRAND_SLUG}-implement`'s controls verbatim — confirmation before external-state changes, no
auto-merge, no force-push, no hook bypass. The pipeline only *adds* the product-owner pre-check, the
multi-perspective board, and the bounded decide-loop on top. It is an orchestrator skill in the main thread;
the agents it dispatches are one level deep and never spawn further subagents.
