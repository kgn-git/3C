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
below): `/${BRAND_SLUG}-project-manager <plan|enrich|status|sprint-close|deliver> [target]`.

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
parallel and reconcile via `${FRAMEWORK_SLUG} reconcile` into one verdict. If `${FRAMEWORK_SLUG} reconcile` refuses its input, the CLI is fine and stderr says why: `exceeds the` byte limit
(shorten each finding's message and suggestion, then re-run), `cannot read input` (fix the `--file` path or pipe), or
`invalid findings JSON` (fix the assembled JSON). **If it fails with `Unknown command`, STOP** — the installed
CLI predates the reconciler. Do not improvise a verdict; tell the user to upgrade/reinstall the CLI from your
framework's distribution, then verify with `${FRAMEWORK_SLUG} doctor`. On any other non-zero exit, STOP and show the user the error; never improvise a verdict.

### 4. Reconcile + decide (auto)
- `clean` / `advisory` → proceed to ship.
- `blocking` → run **one** bounded fix cycle (return to stage 2 for the flagged items), then re-run the
  board. If it is still blocking after that single cycle, **stop and hand off to a human** with the board
  report. Never loop unbounded; never silently proceed past a blocking verdict.

### 5. Ship (checkpoint)
- **Confirm with the user before** creating a branch and **before** opening a PR. These are the external,
  hard-to-reverse steps.
- **Never** auto-merge, **never** force-push, **never** bypass hooks (`--no-verify`) or the pre-commit gate.
- File the handover as a **closed `handover`-labelled issue**, never a committed file. Render the body
  from `.github/ISSUE_TEMPLATE/handover.md` (installed by `${BRAND_SLUG} setup`): it MUST open with a fenced
  `yaml` block holding the `3c-handover/1` metadata, computed by the pipeline **at ship time**. That
  block is what the `${BRAND_SLUG} dashboard` delivery view reads (from `handover`-labelled issues through
  `gh`, cached locally for 15 minutes; only owners', members' and collaborators' issues count; a failed
  fetch is named, and anything missing here renders as a blank):

  ````markdown
  ```yaml
  schema: 3c-handover/1
  issue: <N>                  # or `issues: [..]` when one delivery closes several
  title: "<issue title>"
  pr: <PR number>
  merge_sha: "<short sha>"    # quoted: an all-digit sha would read as a number
  branch: "<feature branch>"
  started: <first branch commit, ISO-8601 UTC>
  merged: <merge timestamp, ISO-8601 UTC>
  verdict: { level: <clean|advisory|blocking>, blocking: 0, warnings: 0, suggestions: 0, fixed_in_branch: 0 }   # from the board
  tests_total: <suite size at merge>
  loc: { added: 0, removed: 0, files: 0 }   # from the merge diff shortstat
  follow_ups: []              # issue numbers filed during this delivery
  gates_fired: []             # OPTIONAL, additive — NO schema bump. The load-bearing gates that
                             # fired on this delivery, as gate-name strings only: scan-secrets,
                             # red-before-green, verify-gate, no-auto-merge,
                             # reconcile-anti-improvisation, pretooluse-path-guard,
                             # sprint-readiness, capability-tier. Metadata-only: never raw command output, file
                             # contents, or env values. Missing renders as blank.
  ```
  ````

- File it with `${BRAND_SLUG} implement file-handover < handover.md`. It files nothing when the block
  would not validate or the body matches a secret pattern, finds an already-filed handover for the same
  delivery instead of filing a second, and closes the issue it opens. When the `handover` label does not
  exist yet, create it first:
  `gh label create handover --description "3C delivery handover" --color 0E8A16`.
  If filing fails it prints the exact `gh` commands that finish the job — run them; a handover is never
  dropped.
- The block carries delivery metadata only — it MUST NOT embed credentials, tokens, command output,
  environment values or diff content (an issue's edit history keeps whatever was first posted).
- Below the block, the narrative stays human-first: what changed, the board verdict, any needs-human
  items, follow-ups.

### 6. Retrospective (optional)
After shipping, **optionally** capture a retrospective: `/${BRAND_SLUG}-retrospective <scope>`. This is a
suggestion only — it is **not** a gate, has no pass condition, and never blocks the pipeline. Skip it freely;
the single-issue flow is complete at stage 5 whether or not a retro is run.

## Milestone operations

Sprint-level coordination for the team's issue tracker, alongside the per-issue pipeline above. The
target repository is whatever the current checkout's tracker is — never hard-code one.

### deliver "<milestone>"

Run the per-issue pipeline (stages 1–5 above) across every open issue in a milestone. This composes
the pipeline rather than defining a second one.

1. **Resolve the milestone name first** — `gh api repos/<owner>/<repo>/milestones --jq '.[].title'`
   and require an exact match against that list. Do not interpolate an unmatched name into the
   command below: `"<name>"` is a shell string, and double quotes do not neutralise `$(…)` or
   backticks. Reject anything that does not match exactly.
2. **Fetch and order** — `gh issue list --milestone "<name>" --state open --json number,title,labels,body`.
   Sequence in **dependency order**, not issue-number order: foundations before dependents, per each
   issue's `## Dependencies` section — which is why `body` is in the field list. State the resolved
   order **and the issue count** before starting, so a wrong sequence or an unexpectedly large batch
   is caught before any branch exists. Past 5 issues, batch per the process rule below.
3. **Deliver each issue** — run stages 1–5 for issue N to a merged PR, then move to N+1. Batch runs
   go **straight through** with no per-issue go/no-go checkpoint; the stage-5 confirmations
   (branch, PR) still apply to each issue individually and are never waived.
   Iterate the stages **inline in this thread**. Never dispatch `/${BRAND_SLUG}-project-manager` per
   issue, and never wrap it in a general-purpose subagent: that re-enters the orchestrator and stacks
   a second dispatch level under it, multiplying the board's parallel agents by the issue count. The
   flat-dispatch invariant binds skills here, not just agents.
4. **Serialise** — do not open the next issue's branch until the current issue's PR is merged.
   Concurrent branches over a shared surface produce conflicting edits to the same files.
5. **Stop conditions** — a `blocking` board verdict that survives its one bounded fix cycle stops the
   **batch**, not just that issue; hand off to a human with the board report. A missing or unclear
   AC section stops that issue only: report it and continue to the next.

Zero open issues → verify the milestone name with `gh api repos/<owner>/<repo>/milestones` before
reporting the milestone complete.

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

### Sprint readiness — the gate before any implementation

**Implementation MUST NOT begin on a milestone batch until BOTH gates below have run and their
findings are resolved, or explicitly deferred with a tracked issue reference.** Record
`sprint-readiness` in the delivery's `gates_fired`.

**1. Enrichment — per issue.** Run `enrich` on every issue in the batch. It asks whether *this* issue
is buildable: are the acceptance criteria testable actions, is the scope bounded, is the maturity
level right, could a developer build it without coming back to ask.

**2. Coherence — cross-issue, across the whole batch.** Enrichment cannot see this, because each issue passes its own
review while the *set* is incoherent. Read every issue in the milestone together and report:

- **Contradictions** — two issues that require opposite things of the same file or rule.
- **Shared surfaces** — two issues that will both edit the same skill, validator or config, and so
  cannot be delivered in parallel without one clobbering the other.
- **Dependency order** — an issue whose premise depends on another that is sequenced after it.
- **Duplicate or overlapping scope** — work that appears in two issues under different names.
- **Load-bearing assumptions** — a claim an issue makes about the codebase that is no longer true.
  Check it, do not assume it: an issue body is the author's belief, not evidence.

Report the findings as a table and stop if any is unresolved. A conflict found here costs minutes; the
same conflict found mid-sprint costs a delivery.

**Why this is a gate and not advice.** It was added after a sprint that ran implementation-first:
enrichment run late found blocking defects in four of five issues, including false constraints the
author had written into the issue bodies. The subcommands existed the whole time — they ran when
someone remembered, and memory lapses.

### status / sprint-close "<milestone>"

**`sprint-close` runs the full suite first.** Before any summary is produced, run the project's
aggregate build and check scripts — read the names from the project manifest, never hand-expand them
into a step list — and **quote the output**. An unquoted "all green" is not evidence.

**Exit gate:** both return zero. A non-zero return blocks the close; fix it, or reopen the issue that
caused it.

This run MUST NOT be narrowed. `${FRAMEWORK_SLUG} test select` exists for the inner TDD loop only; it
never applies here, and neither does any hand-picked subset. The reason is structural: per-issue
selection is a bet that the read-map is complete, and sprint-close is where that bet is settled. A
sprint closed on a narrowed run has verified nothing about the issues that closed before it.

Then produce the sprint summary: a table (issue / priority / lens reviews / status), flags (dependency
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
