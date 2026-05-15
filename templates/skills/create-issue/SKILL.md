---
name: create-issue
description: Create structured GitHub issues with team-template population. User-only skill; not auto-invoked by the model.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash]
disable-model-invocation: true
---

# /${BRAND_SLUG}:create-issue

Guide the user through creating a well-structured GitHub issue. **This skill does not auto-attach code, environment, or system state. Issue content is exactly what you provide.**

## Workflow

When the user invokes `/${BRAND_SLUG}:create-issue [<short summary>] [--template=<bug|feature|chore>]`, follow this flow:

### 1. Pick or confirm the template

If `--template=` is in the args, use that. Otherwise, ask:

> Which template should I use?
> - `bug` — something broken, with reproduction steps
> - `feature` — new capability with user story + AC
> - `chore` — refactor, dependency bump, docs

Read the template body from `.claude/skills/create-issue/templates/<template>.md`.

### 2. Prompt the user for the structured fields the template requires

Bug:
- **Affected component** (single line)
- **Severity** — one of `critical`, `high`, `medium`, `low`
- **Steps to reproduce** (numbered list; ask for *minimal* repro — do not paste large logs)
- **Expected behaviour**
- **Actual behaviour**
- **Acceptance criteria** (numbered list)
- **Dependencies** (issue numbers that block this, if any)

Feature:
- **User story** (As a / I want / So that)
- **Affected component(s)**
- **Acceptance criteria** (numbered list)
- **Estimated complexity** — one of `S`, `M`, `L`, `XL`
- **Dependencies** (issue numbers, if any)

Chore:
- **Reason** (1–2 lines)
- **Affected area**
- **Acceptance criteria** (numbered list)

### 3. Check for team-mandated fields

If `.${BRAND_SLUG}/skills/create-issue.yaml` exists in the workspace root, read it for mandatory fields:

```yaml
mandatory:
  - labels:
      - bug      # at least one of these labels MUST be set on bug template
      - feature
      - chore
  - assignees: false   # not required
```

If a mandatory field is missing, prompt for it before submitting. Do not submit with a missing mandatory field.

### 4. Assemble + show

Render the template with the gathered fields. Show the user the complete issue body before submitting.

### 5. Run preflight + submit

Invoke the runtime helper:

```bash
${FRAMEWORK_SLUG} create-issue
```

Pipe a single-line JSON payload to its stdin:

```json
{"title": "...", "body": "...", "labels": ["bug"], "assignees": [], "repo": null}
```

The helper:
1. Runs preflight: secret-pattern + large-code-block warnings
2. If a *secret* warning is present, the helper exits 1 and prints diagnostics. Show them to the user. If they confirm, re-invoke with `--force`. (For *large-code-block* warnings, the helper does not block but emits the warning to stderr — relay it to the user.)
3. Otherwise, shells to `gh issue create` and returns the issue URL + number on stdout.

### 6. Surface the result

On success, tell the user the URL and number. On failure, surface the error (especially if it suggests `gh auth login`).

## What this skill does NOT do

- It does **not** read source files, environment variables, or system state automatically.
- It does **not** auto-include `git diff`, terminal history, or running-process information.
- It does **not** transmit anything to GitHub except the title, body, labels, assignees, and repo the user explicitly provided.

## Out of scope at L1

- Jira Cloud, Linear, GitLab Issues — those PM-tools land in L2 alongside the bundled MCP server.
- OAuth flows for non-`gh` tools.
- Auto-redaction sanitiser pipeline (`--scrub-secrets`) — L2.
