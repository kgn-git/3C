---
name: Handover
about: The delivery record the 3C pipeline files when a change ships. Closed on creation.
title: "Handover — #<issue>: <issue title>"
labels: handover
---
```yaml
schema: 3c-handover/1
issue: 0                    # the delivered issue; or `issues: [..]` when one delivery closes several
title: "<issue title>"
pr: 0
merge_sha: "<short sha>"
branch: "<feature branch>"
started: 2026-01-01T00:00:00Z
merged: 2026-01-01T00:00:00Z
verdict: { level: advisory, blocking: 0, warnings: 0, suggestions: 0, fixed_in_branch: 0, by_category: {} }
board_rounds: 0
tests_total: 0
loc: { added: 0, removed: 0, files: 0 }
follow_ups: []
gates_fired: []
```

<!-- The block above must open the issue: `3c dashboard` reads it from the
     first line. Metadata only — never credentials, command output or env
     values. Narrative below: what changed, the board verdict, lessons, decisions, follow-ups. -->

<!-- Lessons and Decisions: one line each, written "- <text> (source: agent)" or "(source: owner)".
     An agent writes a decision as "(source: agent, unconfirmed)", and the owner confirms it at ship by
     changing it to "(source: owner)". `3c memory brief` shows these lines as notes, never as a ruling. -->

## What changed

## Board verdict

## Lessons

## Decisions

## Follow-ups
