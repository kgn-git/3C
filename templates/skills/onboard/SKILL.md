---
name: ${FRAMEWORK_SLUG}-onboard
description: Guided codebase onboarding for new team members. Presents an architecture/key-files/workflows roadmap, tracks per-developer progress with pause/resume, answers from local standards and docs, and recommends a level-appropriate starter task. All state is local to the workstation.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read]
disable-model-invocation: false
---

# /${FRAMEWORK_SLUG}-onboard — guided onboarding for ${FRAMEWORK_NAME}

When a new team member asks to be onboarded, drive the `onboard` CLI:

## 1. Show the roadmap and current position

Run `${FRAMEWORK_SLUG} onboard --user <name>` (defaults to the OS user). `<name>` must be a plain name — letters, digits, `.`, `_`, `-`, up to 64 characters, not starting with `.` or `-`, no path separators; anything else is refused, so on a refusal re-run with such a name.

Every run ends with a `Done:` line and a `Next:` line naming the exact command to run next — relay that line to the developer rather than composing your own. After the last module the next step is `${FRAMEWORK_SLUG} onboard --starter` (a first task), and `${FRAMEWORK_SLUG} dashboard` shows everyone's onboarding progress. `--starter` lists issues through an authenticated GitHub CLI (`gh`); if it reports that `gh` is unavailable or finds nothing, the developer should ask their lead. Confirm with the developer before running `--advance` — it marks a module done and cannot be undone from the CLI.
Present the returned roadmap (architecture → key-files → workflows) and
highlight the developer's current module. Progress persists in
`.${FRAMEWORK_SLUG}/onboarding/<user>.yaml` and survives workspace resets.

## 2. Answer questions from team sources

For "why/where/how" questions run
`${FRAMEWORK_SLUG} onboard --user <name> --ask "<question>"`.
Answers are drawn only from local standards (`.claude/rules/`) and docs,
and never from the network. They are a plain keyword match over those files:
the first file containing the phrase, quoted around the match. Present them
as that, not as a filtered or permission-aware view of the codebase.

## 3. Advance when a module is understood

Run `${FRAMEWORK_SLUG} onboard --user <name> --advance` to mark the
current module complete and move to the next. The developer can stop any
time and resume days later from exactly where they left off.

## 4. Tailor the roadmap to a role

Run `${FRAMEWORK_SLUG} onboard --user <name> --role <frontend|backend|devops>` to append
that role's modules to the project-derived roadmap. The role is stored with
the developer's progress, so later runs need no flag. An unrecognised role
is rejected rather than silently replaced with a generic one.

## 5. Recommend a starter task

Run `${FRAMEWORK_SLUG} onboard --user <name> --level <label> --starter`
to recommend an appropriate open backlog issue.

Finishing the last module writes a local completion record to
`.${FRAMEWORK_SLUG}/onboarding/completions/<user>.yaml` — user and timestamp only, never
onboarding activity, and nothing leaves the workstation.

This skill is the whole of onboarding. The role-tailored guide that used to
ship beside it (VP-06-F01) was folded in as `--role`.
