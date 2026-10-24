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

If it instead prints `{"scanned": false, ...}` and exits non-zero, the plan was NOT scanned (it was over the input limit, or could not be read). That is not a clean result: do not display it. Scan the plan in parts split at line boundaries, one call each — never mid-line, which can cut a secret in two and scan both halves clean.

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

The team's rules from `.claude/rules/**/*.md` are already in your context: Claude Code loads `.claude/rules/` on its own, and `${FRAMEWORK_SLUG} rules apply` injects the `load: inject` ones into CLAUDE.md. When generating code, consult those rules — do NOT re-load them.

If the rules suggest the workspace lacks security or pattern coverage, you MAY suggest `${FRAMEWORK_SLUG} rules install security/owasp-top-10` (or a pattern pack) to the user, but do NOT run it yourself — that's a team-level config change.

## 5. Test-first implementation loop (AC5)

For each target file in your plan:

a. Write the test FIRST, via the `/${BRAND_SLUG}-test` sub-skill. Resolve the runner once:

```bash
${FRAMEWORK_SLUG} test detect-framework
```

Then write a test that states what the code should do, in that runner's idiom. There is no
generator: you have the source and the acceptance criteria in context, and a template cannot
know what the code is supposed to do.

b. Check the assertion can actually fail. `expect(x).toBeDefined()`, `assert.ok(x)`,
   `assertNotNull(x)` and `assert x is not None` all pass the moment the symbol exists and
   assert nothing about behaviour. Write the assertion that would break if the code were
   wrong.

c. Write the test file:

```bash
${FRAMEWORK_SLUG} test write <target-path> <<'TEST_CONTENT_EOF'
<test content>
TEST_CONTENT_EOF
```

The single-quoted heredoc delimiter (`'TEST_CONTENT_EOF'`) suppresses shell expansion — the same pattern as Step 2 — so multi-line content, or content containing single quotes, backticks or `$`, is passed through unchanged. Do **not** pipe it in with `echo '<content>'`: a single apostrophe in a test name closes the quote and the rest of the body is interpreted by the shell (`.claude/rules/security/owasp-top-10/a05-injection-shell.md`).

The write helper applies path-traversal + scanSecrets + no-overwrite guards. If it refuses, surface the error and stop. Do **NOT** re-attempt a secret-scan or path-traversal refusal with the Write tool — that reaches the same result with the guard removed. `/${BRAND_SLUG}-test` carries the full refusal → recovery table.

d. Run the test — confirm it FAILS **on its assertion**, for the reason you expect (RED). A
   test that dies on a missing import or a syntax error is a broken test, not an unwritten
   one; fix it and re-run before treating the RED as real.

Ask for the narrowed selection rather than running the whole suite on every iteration:

```bash
${FRAMEWORK_SLUG} test select
```

It prints the command(s) to run and the reason it chose them. Run exactly what it prints, and **read the reason line** — that is the point of printing it.

Selection is deliberately conservative. Source files go to the test runner's own related-mode; a changed file that tests READ rather than import is resolved through `.${BRAND_SLUG}/test-map.json`, because a module graph cannot see that edge. Anything with repo-wide reach, and anything unmapped, escalates to the full suite. A run that covers nothing must never be able to look like a run that passed.

If the team has no `test-map.json`, only source changes narrow and everything else runs in full. That is the correct default, not a gap to work around.

**"No test files found" is a FAILURE, not a pass.** Module-graph selection reports success having run nothing when it matches no test — measured, and the reason this command exists. If a selected run reports no test files, do not treat it as green: re-run the full suite, and say so. That outcome means the selection was wrong, and the only safe response is to stop trusting it for that changeset.

This applies to the inner loop **only**. The project-level verify gate before the PR runs the full suite and must not be narrowed.

e. Implement the minimum source code to make the test pass — use the Write tool. The team's rules in your context constrain HOW; the test constrains WHAT.

f. Run the same selection again — confirm it PASSES (GREEN).

   **Falsify each guard.** A test that guards a rule (a filter, a validator, a refusal, a
   check that something is absent) is not trusted until you break the code it protects and
   watch it go red. Run the selection on the unchanged tree first, so a red result means
   something; then mutate the guarded path (delete the check, invert the condition, widen
   the filter), confirm the test fails for that reason, restore the code and confirm it is
   green again. A green mutation is a finding: the behaviour is unguarded. Where a test
   asserts a filtered list is empty (`toEqual([])`, `not.toContain`), pair it with a positive
   assertion that the same filter finds something known to be there; an empty result from a
   filter that matches nothing proves nothing. Record each mutation and its red in the PR
   description or the handover.

g. Commit (the hook chain runs via Sprint-2 #2 orchestrator — let it):

```bash
git add <files>
git commit -m "<conventional commit message>"
```

If the commit fails because the hook chain exits non-zero, surface the hook's stderr to the user verbatim. Fix the underlying issue (lint, format, etc.) by editing the relevant files and re-running steps 5e-5g. The AC9 interlock forbids `--no-verify` even in this situation — never bypass the hook chain to "unblock" the commit.

If you find yourself about to call Write on a source file before a FAILING test for it exists,
STOP and write the test first. The interlock is the failing test, not any particular command.

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

### 6.a Project-level verify gate

The review above is a code-quality lens. It does not prove the project still builds. Before the PR,
run your project's own build and full-check commands and **quote the output of each in your next
message** — the quoted output is the evidence; an unquoted "all green" is not.

Read the command names from the project's manifest rather than assuming them (for a Node project,
the `scripts` block of `package.json` — typically a build script and an aggregate check script; the
equivalent for other toolchains). Name the aggregate script, never a hand-copied expansion of its
steps: an enumeration drifts from the manifest silently, and one naming a script that does not exist
is a gate that can never pass and so gets waived on first contact.

**Exit gate:** every command returns zero. Any non-zero return sends you back to step 5 — a missing
test, or an incorrect implementation. Do not clear the gate by patching around it with `@ts-ignore`,
a disabled lint rule, or by narrowing the test selection; that converts a real failure into a false
green.

**Capability head.** If any acceptance criterion claims a user-facing capability — a command a
person runs, a hook that fires, an output they act on — unit coverage does not close it. Exercise it
through the entry point the user reaches: the installed binary as a child process, or the hook
command exactly as the settings file registers it, in a workspace provisioned the way an adopter's
is. Never by importing the function directly. A suite can call the right function, assert the right
result, and pass indefinitely while nothing in the product calls that function at all; a test one
layer below the defect reports green forever.

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

## 8. Handover artefact (after the PR merges)

File the handover for this delivery as a closed `handover`-labelled issue, never a committed file. Its
body comes from `.github/ISSUE_TEMPLATE/handover.md` and MUST open with a fenced `yaml` block holding
the `3c-handover/1` metadata computed at ship time: `issue` (or `issues: [..]`), `title`, `pr`,
`merge_sha`, `branch`, `started` (first branch commit, ISO-8601 UTC), `merged`,
`verdict: { level, blocking, warnings, suggestions, fixed_in_branch }` (when a review board ran),
`tests_total`, `loc: { added, removed, files }` from the merge diff, the OPTIONAL additive
`gates_fired` (an array of load-bearing gate-name strings: `scan-secrets`, `red-before-green`,
`verify-gate`, `no-auto-merge`, `reconcile-anti-improvisation`, `pretooluse-path-guard`,
`sprint-readiness`, `capability-tier`; metadata-only — never raw command output, file contents, or env
values), and `follow_ups` (issue numbers filed during the delivery). The `${BRAND_SLUG} dashboard`
delivery view reads exactly this block from `handover`-labelled issues through `gh`, cached locally for
15 minutes; a failed fetch is named, never shown as an empty view, and omitted fields render as blanks.

File it with `${BRAND_SLUG} implement file-handover < handover.md`: it files nothing when the block would
not validate or the body matches a secret pattern, never files a second handover for the same delivery,
and closes the issue it opens. When the `handover` label is missing, create it first with
`gh label create handover --description "3C delivery handover" --color 0E8A16`. If filing fails, run the
`gh` commands it prints; never drop the handover. The block carries delivery metadata only — no
credentials, tokens, command output, environment values or diff content. The narrative below the block
stays human-first. The full block shape is specified in the `/${BRAND_SLUG}-project-manager` skill's ship
stage; keep the two in sync.

## What this skill does NOT do

- Issue-status transitions beyond `Closes #N` — out of scope. PM-tool adapters ship at L2 via [#70](https://github.com/kgn-git/praise/issues/70) but don't add status-transition logic to this skill; the L3 [#36](https://github.com/kgn-git/praise/issues/36) Process Adherence Monitor is the right home for status-transition observability.
- TDD enforcement via pre-commit hook — now ships at L2 ([#16](https://github.com/kgn-git/praise/issues/16) Post-Edit Validation). The retired Test Coverage Gate ([#17](https://github.com/kgn-git/praise/issues/17)) was the other half of that claim until [#396](https://github.com/kgn-git/praise/issues/396) removed it; it never ran, and the capability re-enters whole under [#432](https://github.com/kgn-git/praise/issues/432). The SKILL.md prose discipline above remains this skill's L1-level reminder; the gate that ships is what enforces it.
- Auto-merge / merge-on-CI-green — horizon, not on the active backlog.
- PM tools (Jira, Linear, GitLab) reached through the in-process adapter registry ship since [#70](https://github.com/kgn-git/praise/issues/70). The `fetchIssue` / `createPr` signatures remain the swap-point seams; behaviour is unchanged on the `gh` path.
- Cross-skill TypeScript imports — out of scope; at L1 skills compose via Bash invocation of the runtime CLI. The Subagents Primitive ([#51](https://github.com/kgn-git/praise/issues/51)) ships as a separate composition primitive for parallel context-isolated work, not as a back-door for skill-to-skill imports.
