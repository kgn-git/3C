---
name: ${BRAND_SLUG}-onboard-guide
description: Role-tailored interactive onboarding guide. Layers over the onboard skill with frontend/backend/devops roadmaps, module-based progress (completed/in-progress/upcoming), pause/resume across days, answers from team standards and rationale, and a local-first completion record for a mentor. No new-hire activity ever leaves the workstation.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read]
disable-model-invocation: false
---

# /${BRAND_SLUG}-onboard-guide — role-tailored onboarding for ${BRAND_NAME}

The guided-UX layer over `/${BRAND_SLUG}-onboard`. Drive the `onboard-guide`
CLI:

## 1. Pick a role and show the tailored roadmap

`${FRAMEWORK_SLUG} onboard-guide --user <name> --role <frontend|backend|devops>`
Present the role roadmap with each module marked completed `[x]`,
in-progress `[>]`, or upcoming `[ ]`. Progress persists (reuses the onboard
skill's per-developer state) and resumes across days.

## 2. Answer questions from team sources

`${FRAMEWORK_SLUG} onboard-guide --user <name> --role <r> --ask "<q>"` —
answers come only from local standards and docs (no network).

## 3. Advance through modules

`${FRAMEWORK_SLUG} onboard-guide --user <name> --role <r> --advance` marks
the current module done and moves on. On the final module a **local**
completion artifact is written for the mentor; an off-machine notification
is sent only if the team explicitly configured `notifyCommand` in
`.${BRAND_SLUG}/onboarding-guide.yaml`. No new-hire activity leaves the
workstation.
