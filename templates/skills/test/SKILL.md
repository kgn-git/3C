---
name: test
description: Generate unit or integration tests following team conventions for Jest, Vitest, pytest, Mocha, Playwright, or JUnit 5. Detects framework from package configuration, reads conventions from .claude/rules/, writes tests respecting team patterns. Never overwrites existing tests; first write per session requires user confirmation.
version: 1.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read, Write]
disable-model-invocation: false
---

# /${BRAND_SLUG}:test — Generate unit tests for ${BRAND_NAME}

When the user asks for unit tests for a source file, follow this exact workflow:

## 1. Detect the test framework

Run:

```bash
${FRAMEWORK_SLUG} test detect-framework
```

The command prints a JSON object: `{"framework":"jest|vitest|pytest|mocha|playwright|junit|unknown","source":"package.json|pyproject.toml|requirements.txt|playwright.config|pom.xml|build.gradle|null"}`.

- If `framework` is `"unknown"`, ask the user which framework they use. Do NOT guess.
- Otherwise use the reported framework for the next step.

## 2. Choose unit vs integration

- Default to **unit** tests for a single source file's exported behaviour.
- Use **integration** mode (`--type=integration`) when the user asks to test how *multiple modules interact* — pass the primary source plus the collaborating files as extra source arguments. The scaffold includes a test-double seam; replace it with the team's fixture/mock conventions from `.claude/rules/`.

## 3. Generate the scaffold

Run:

```bash
${FRAMEWORK_SLUG} test scaffold <source-path> [extra-sources...] --framework=<detected> [--type=integration]
# (flags may appear before or after the source path)
```

The command prints the suggested target path as a `# suggested-target: …` comment on the first line, then the scaffold body. Any warnings (uncovered branches, missing exports) print to stderr — surface them to the user before writing.

## 4. Read the target path before writing

Before any Write, use the Read tool against the suggested target path. If the file exists, STOP and inform the user. Do NOT overwrite.

## 5. Confirm with the user on the first write per session

On the FIRST file write of a session, you MUST:

1. Present the target path
2. Present the framework detected
3. Show the first ~10 lines of the scaffold body as a preview
4. Ask the user to confirm with an explicit Y/N

Only proceed to the next step if the user says yes.

## 6. Apply the team's conventions

Before writing, consult `.claude/CLAUDE.md` for any team-specific test-file location, fixture-naming, or mock-style conventions. The Sprint-2 #3 rules pipeline has already auto-loaded matching rules from `.claude/rules/` into your context — adjust the scaffold to follow them.

**If the source file is untestable** (tightly coupled globals, hidden side effects, mutable module state), STOP and surface refactoring suggestions to the user rather than fabricate poor-quality tests.

## 7. Write the test file

Run:

```bash
echo '<final-test-content>' | ${FRAMEWORK_SLUG} test write <target-path>
```

(Or use the Write tool with the resolved target path — the runtime helper's path-traversal + secret-scan guards apply only to the CLI path. **Prefer the CLI path** for the secret-scan defence.)

## Fixture credentials — placeholders only

Test fixtures that need credentials MUST use obviously-fake placeholders:

- `"PLACEHOLDER_API_KEY"`
- `"<<example-token>>"`
- `"sk-test-1234567890example"`

The runtime helper refuses to write content containing real-looking credentials. If you fabricate something like `AKIA...` or `ghp_...` the write will fail.

## What this skill does NOT do

- It does NOT enforce coverage thresholds. That's [#17 VP-03-F03](https://github.com/kgn-git/praise/issues/17), L2.
- It does NOT generate integration tests. That's spawned as VP-02-F04-ext.
- It does NOT support Mocha, Playwright, or JUnit. Those are also VP-02-F04-ext.
- It does NOT execute the tests after writing. Run them yourself with the team's standard command.
