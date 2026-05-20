---
name: onboard
description: Guided codebase onboarding for new team members. Presents an architecture/key-files/workflows roadmap, tracks per-developer progress with pause/resume, answers from local standards and docs, and recommends a level-appropriate starter task. All state is local to the workstation.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read]
disable-model-invocation: false
---

# /${BRAND_SLUG}:onboard — guided onboarding for ${BRAND_NAME}

When a new team member asks to be onboarded, drive the `onboard` CLI:

## 1. Show the roadmap and current position

Run `${FRAMEWORK_SLUG} onboard --user <name>` (defaults to the OS user).
Present the returned roadmap (architecture → key-files → workflows) and
highlight the developer's current module. Progress persists in
`.${BRAND_SLUG}/onboarding/<user>.yaml` and survives workspace resets.

## 2. Answer questions from team sources

For "why/where/how" questions run
`${FRAMEWORK_SLUG} onboard --user <name> --ask "<question>"`.
Answers are drawn only from local standards (`.claude/rules/`) and docs —
never from the network and never beyond the developer's access level.

## 3. Advance when a module is understood

Run `${FRAMEWORK_SLUG} onboard --user <name> --advance` to mark the
current module complete and move to the next. The developer can stop any
time and resume days later from exactly where they left off.

## 4. Recommend a starter task

Run `${FRAMEWORK_SLUG} onboard --user <name> --level <label> --starter`
to recommend an appropriate open backlog issue.

This skill is the onboarding **primitive**; the role-tailored interactive
guide (VP-06-F01) layers on top of it.
