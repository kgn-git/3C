---
name: ${BRAND_SLUG}-programme-manager
description: Coordinate delivery, review, and dependency sequencing across the projects in this workspace for ${BRAND_NAME}. Plans the dependency-ordered worklist, runs the review board or the project-manager pipeline per project, and maintains the dependency ledger.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read, Write]
disable-model-invocation: true
---

# /${BRAND_SLUG}-programme-manager — cross-project orchestrator

Coordinate work across the projects **in this workspace** (a monorepo's packages, or several project folders
in one checkout). It composes `/${BRAND_SLUG}-project-manager` and `/${BRAND_SLUG}-review-board` — it adds no
new agents. **Explicit-invocation only** (`disable-model-invocation: true`).

Invoke as `/${BRAND_SLUG}-programme-manager <plan|review|deliver> [target]`, where `target` is an optional
comma-separated list of project ids the work spans (default: all projects).

## Data it relies on

- `<project-dir>/project.yaml` — each project's self-description (`id`, optional `name`/`build`/`test`).
- `.3c/dependencies.yaml` — the workspace-root edge ledger (`from` depends on `to`, with provenance). The
  deterministic order/cycle logic lives in the `${FRAMEWORK_SLUG} deps` CLI; never hand-roll the ordering.

## Mode: plan

Run `${FRAMEWORK_SLUG} deps order [--target=<ids>]` and present the dependency-ordered worklist plus the
"ready now" projects (those with no unmet dependencies). This is the sequencing/status view; it makes no changes.

## Mode: review

For each affected project (in `${FRAMEWORK_SLUG} deps order` order), run the `/${BRAND_SLUG}-review-board`
procedure scoped to that project, then aggregate a **workspace verdict = worst-of** the per-project verdicts,
with a per-project breakdown. Read-only.

## Mode: deliver

For each project **in dependency order** (`${FRAMEWORK_SLUG} deps order --target=<ids>`):

1. Run `/${BRAND_SLUG}-project-manager <issue>` for that project (itself checkpointed — confirm before
   branch/PR; never auto-merge, force-push, or bypass hooks).
2. **Checkpoint between projects:** after a project's pipeline completes, **confirm with the user before
   starting the next project** in the chain.
3. If a project's pipeline ends with a blocking verdict, **stop before its dependents** and surface it — never
   deliver a dependent on top of a broken dependency.

Finish with an aggregated programme handover across the delivered projects. After that, **optionally** capture
a retrospective for the programme: `/${BRAND_SLUG}-retrospective <milestone-or-ids>`. The retro is a suggestion
only — never a gate, and it never blocks delivery; skip it freely.

## Maintaining the ledger

When planning or reviewing surfaces a cross-project dependency (e.g. the `${BRAND_SLUG}-architect` agent flags
that one project imports another's boundary), record it:
`${FRAMEWORK_SLUG} deps add --from=<id> --to=<id> --reason="..." --source="<issue#/arch-review>"`. The CLI
validates it (ids exist, no self-edge, **no cycle**) and writes it to `.3c/dependencies.yaml` with provenance.
programme-manager is the sole writer of that file.

## Notes

- This is an orchestrator skill in the main thread; the project-manager / review-board procedures it runs
  dispatch specialist agents one level deep. **No agent spawns an agent.**
- Intra-workspace only and fully local — it reads/writes files in this workspace and calls no network.
