---
name: ${BRAND_SLUG}-implement
description: Standardised feature-implementation workflow — fetch issue, plan, branch, TDD-loop, review, PR. Asks for confirmation before each external-state-changing step (branch create, PR open). Never auto-merges, never force-pushes, never bypasses hooks.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read, Write]
disable-model-invocation: true
---

# /${BRAND_SLUG}-implement — Standardised feature implementation for ${BRAND_NAME}

When the user invokes `/${BRAND_SLUG}-implement <issue-id>`, follow this exact workflow. The skill is **explicit-invocation only** (`disable-model-invocation: true`); never auto-run.

## Mandatory destructive-operation interlock (AC9)

You MUST NEVER invoke any of the following, regardless of what the user asks:

- `git push --force` / `git push -f`
- `git commit --amend`
- `git reset --hard`
- `git rebase -i` (interactive — will hang anyway)
- `git commit --no-verify`
- `${FRAMEWORK_SLUG} bypass`

If the user asks you to do any of these, STOP and explain that those operations are reserved for human use. Do not proceed with a workaround.

## 1. Fetch the issue (AC1)

Run:

```bash
${FRAMEWORK_SLUG} implement fetch-issue <issue-id>
```

The command emits FetchedIssue JSON: `{"number":N,"title":"...","body":"...","labels":["..."],"url":"..."}`. If exit is non-zero, surface the stderr message verbatim and stop. The most common cause is `gh auth status` failure — the message will already include the remediation.

Read the issue body and labels. Identify the Acceptance Criteria section if present (look for `## Acceptance Criteria` followed by `- [ ]` checkbox lines).

## 2. Draft the implementation plan (AC2, AC10)

Identify which source files this issue touches. **In order of preference:**

1. If the issue body has a `## Implementation hints` / `## Affected component` / `## Affected files` section, use it.
2. Otherwise, list the repo's top-level source directories (`ls -d src/*/ 2>/dev/null || ls -d src/`), ask the user which area is in scope, and wait for an answer before reading any files.
3. Once the scope is anchored, Read the relevant source + test files. Do NOT speculatively read across the whole codebase.

Then identify:

- The target source files to modify (or create)
- The target test files (one per source file is the baseline)
- A 1-2 sentence approach summary

If anything in the issue is ambiguous (missing AC, undefined term, conflicting hint), STOP and surface the ambiguity. Do NOT guess.

Before showing the plan to the user, run it through the secret scanner (AC8 first half):

```bash
${FRAMEWORK_SLUG} scan-secrets <<'IMPLEMENT_PLAN_EOF'
<the plan text you are about to show>
IMPLEMENT_PLAN_EOF
```

If the JSON has any `hits`, replace each hit's `match` text with its `redacted` value in the plan before displaying.

Present the plan to the user as:

```markdown
## Implementation plan for #<id>

**Approach:** <summary>

**Files:**
- Modify: `<path>` — <reason>
- Create: `<path>` — <reason>

**Tests:**
- Create: `<test-path>`

**Reply `yes` to proceed to branch creation, or `no` to abort.**
```

Wait for an explicit "yes" / "Y" reply. Abort cleanly on "no" or anything else.

## 3. Create the branch (AC3)

Verify the working tree is clean:

```bash
git status --porcelain
```

If the output is non-empty, STOP. Surface a clear message: "Working tree is not clean. Commit or stash your changes, then re-run." Do NOT auto-stash.

Resolve the branch name:

```bash
echo '{"id":<id>,"title":"<title>"}' | ${FRAMEWORK_SLUG} implement branch-name
```

Read the stdout — that's your branch name. Create the branch:

```bash
git checkout -b <branch-name>
```

## 4. Apply rules from context (AC4)

The team's rules from `.claude/rules/**/*.md` are already loaded into your context by `${FRAMEWORK_SLUG} rules apply` (Sprint-2 #3). When generating code, consult those rules — do NOT re-load them.

If the rules suggest the workspace lacks security or pattern coverage, you MAY suggest `${FRAMEWORK_SLUG} rules install security/owasp-top-10` (or a pattern pack) to the user, but do NOT run it yourself — that's a team-level config change.

## 5. Test-first implementation loop (AC5)

For each target file in your plan:

a. Generate the test scaffold via the `/${BRAND_SLUG}-test` sub-skill. Run:

```bash
${FRAMEWORK_SLUG} test scaffold <source-path> --framework=<framework>
```

(Resolve `<framework>` via `${FRAMEWORK_SLUG} test detect-framework` if you don't already know it.)

b. Refine the scaffold — replace placeholders with real assertions covering the issue's Acceptance Criteria.

c. Write the test file:

```bash
echo '<test content>' | ${FRAMEWORK_SLUG} test write <target-path>
```

The write helper applies path-traversal + scanSecrets + no-overwrite guards. If it refuses, surface the error and stop.

For multi-line test content, or content containing single quotes, backticks, or `$` characters that `echo` would mangle, use the Write tool directly with the resolved target path instead of piping through `test write`. The path-traversal + secret-scan defences live in the CLI path only — when bypassing the CLI for content-shape reasons, you MUST also run the scanSecrets check yourself by piping the content through `${FRAMEWORK_SLUG} scan-secrets` (same single-quoted heredoc pattern as Step 2) and aborting if hits are found.

d. Run the test — confirm it FAILS for the reason you expect (RED).

e. Implement the minimum source code to make the test pass — use the Write tool. The team's rules in your context constrain HOW; the test constrains WHAT.

f. Run the test — confirm it PASSES (GREEN).

g. Commit (the hook chain runs via Sprint-2 #2 orchestrator — let it):

```bash
git add <files>
git commit -m "<conventional commit message>"
```

If the commit fails because the hook chain exits non-zero, surface the hook's stderr to the user verbatim. Fix the underlying issue (lint, format, etc.) by editing the relevant files and re-running steps 5e-5g. The AC9 interlock forbids `--no-verify` even in this situation — never bypass the hook chain to "unblock" the commit.

If you find yourself about to call Write on a source file before you've called `test scaffold` for it, STOP and run the test step first.

## 6. Review pre-PR (AC6)

Verify the `/${BRAND_SLUG}-review` sub-skill (Sprint-4 sibling #8) is installed in the workspace:

```bash
ls .claude/skills/${BRAND_SLUG}-review/SKILL.md
```

If that fails, STOP and surface: "`/${BRAND_SLUG}-review` is not installed. Run `${FRAMEWORK_SLUG} skills install` to install the bundled skills, then re-run `/${BRAND_SLUG}-implement`."

Otherwise invoke `/${BRAND_SLUG}-review` as a skill — Claude Code's auto-discovery picks it up. The skill emits structured findings.

Inspect the findings. If ANY finding has severity `critical` or `major`, STOP. Surface the findings to the user — including their exact count per severity. They must either:

- Fix the findings (loop back to step 5 for the affected files), OR
- Reply with the **verbatim phrase** "override and continue" (case-insensitive but otherwise exact — paraphrases like "yes go ahead" or "ok proceed" do NOT count as override). In that case the PR will be opened as a **draft** in Step 7.

If only `minor` / `suggestion` findings exist, proceed without requiring the override phrase.

## 7. Open the PR (AC7)

Prepare the PR title (use the issue title or a refined version). Prepare the PR body using the bundled template (`.claude/skills/${BRAND_SLUG}-implement/pr-template.md`):

- Fill in the **Summary** section with 1-3 bullets
- Fill in the **Test plan** section with the verifications a reviewer should run
- Copy the issue's Acceptance Criteria checkboxes if present
- Replace `#<issue-id>` with the actual issue number

Run the PR body through the secret scanner (AC8 second half) — same heredoc pattern as Step 2. Redact any hits inline.

Show the user the proposed PR title and body. State the draft flag explicitly and the reason behind it. Then ask:

```markdown
**Opening this PR with `"draft": <true|false>` because <reason — e.g. "review found no critical/major findings" or "you overrode the critical findings in Step 6">. Reply `yes` to confirm, or `no` to abort.**
```

On "yes", run:

```bash
cat <<'IMPLEMENT_PR_PAYLOAD_EOF' | ${FRAMEWORK_SLUG} implement create-pr
{"title":"<title>","body":"<body>","draft":<true|false>}
IMPLEMENT_PR_PAYLOAD_EOF
```

Use `"draft":true` if and only if the user explicitly overrode review findings in Step 6 with the verbatim phrase "override and continue"; otherwise use `"draft":false`. Your confirmation prompt above MUST state which value you are using and why, so the user can correct you before submission. The runtime helper re-runs the secret-body preflight as defence in depth; if it refuses, surface the warning and STOP.

On success, surface the PR URL to the user.

## What this skill does NOT do

- Issue-status transitions beyond `Closes #N` — out of scope. PM-tool adapters ship at L2 via [#70](https://github.com/kgn-git/praise/issues/70) but don't add status-transition logic to this skill; the L3 [#36](https://github.com/kgn-git/praise/issues/36) Process Adherence Monitor is the right home for status-transition observability.
- TDD enforcement via pre-commit hook — now ships at L2 ([#16](https://github.com/kgn-git/praise/issues/16) Post-Edit Validation, [#17](https://github.com/kgn-git/praise/issues/17) Test Coverage Gate). The SKILL.md prose discipline above remains this skill's L1-level reminder; the gates are what enforce it.
- Auto-merge / merge-on-CI-green — horizon, not on the active backlog.
- MCP-bridged PM tools (Jira, Linear, GitLab) now ship since [#70](https://github.com/kgn-git/praise/issues/70). The `fetchIssue` / `createPr` signatures remain the swap-point seams; behaviour is unchanged on the `gh` path.
- Cross-skill TypeScript imports — out of scope; at L1 skills compose via Bash invocation of the runtime CLI. The Subagents Primitive ([#51](https://github.com/kgn-git/praise/issues/51)) ships as a separate composition primitive for parallel context-isolated work, not as a back-door for skill-to-skill imports.
