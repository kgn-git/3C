---
name: ${BRAND_SLUG}-test
description: Write unit or integration tests test-first, following team conventions, for whatever framework the project uses. Detects the framework from package configuration, reads conventions from .claude/rules/, and writes a test that FAILS before the implementation exists. Never overwrites existing tests; first write per session requires user confirmation.
version: 2.0.0
compatibility: [claude-code]
allowed-tools: [Bash, Read, Write]
disable-model-invocation: false
---

# /${BRAND_SLUG}-test — Write tests test-first for ${BRAND_NAME}

When the user asks for tests for a source file, follow this exact workflow.

**This skill does not generate code for you.** It tells you what a correct test must be, and gives
you the deterministic facts you cannot guess — which runner the project uses, and where the file
goes. You read the source, you know what it should do, so you write the test. That division is
deliberate: a generator can only emit boilerplate plus a placeholder, and it cannot know
what the code is supposed to do.

## 1. Detect the test framework

Run:

```bash
${FRAMEWORK_SLUG} test detect-framework
```

The command prints `{"framework":"jest|vitest|pytest|mocha|playwright|junit|unknown","source":"…"}`.

- If `framework` is `"unknown"`, ask the user which framework they use. Do NOT guess.
- Otherwise use the reported framework. Write idiomatic code for **that** runner — its import
  style, its assertion API, its file-naming convention. If the project uses a framework not in
  that list, use it anyway; the detector's list is not a limit on what you can write.

## 2. Choose unit vs integration

- Default to **unit** tests for a single source file's exported behaviour.
- Use **integration** when the user asks how *multiple modules interact*. Wire the real
  collaborators; replace any test double with the team's fixture/mock conventions from
  `.claude/rules/`.

## 3. Write a test that FAILS first

This is the step the skill exists for.

**The test must fail before the implementation exists, and it must fail on its assertion** — not
on a missing import, not on a syntax error. A test that dies while loading reports a broken test,
not an unwritten one.

References ship for `jest`, `pytest` and `vitest`. Start from `scaffolds/<framework>.md` in this
skill's directory if you want the shape — those model an explicit failure and list the assertions
that pass without testing anything. For a runner with no reference — mocha, playwright, junit or
anything the detector did not name — follow the same shape in that runner's own idiom.

**An assertion that cannot fail is not a test.** These all pass the moment the symbol exists and
tell you nothing about behaviour:

```
expect(result).toBeDefined()      expect(result).toBeTruthy()
assert.ok(result)                 assertNotNull(result)
assert result is not None         assert True
```

Write the assertion that states what the code should *do* — `expect(add(2, 3)).toBe(5)` — and
confirm it fails for that reason before you implement.

**If the source file is untestable** (tightly coupled globals, hidden side effects, mutable module
state), STOP and surface refactoring suggestions rather than fabricate poor-quality tests.

## 4. Resolve the target path and read it before writing

Use the project's convention for the detected framework — `x.test.ts` beside `x.ts` for
vitest/jest, `test_x.py` for pytest, `XTest.java` for junit — unless `.claude/CLAUDE.md` or
`.claude/rules/` says otherwise.

Before any Write, use the Read tool against that path. **If the file exists, STOP and inform the
user. Do NOT overwrite.**

## 5. Confirm with the user on the first write per session

On the FIRST file write of a session, you MUST:

1. Present the target path
2. Present the framework detected
3. Show the first ~10 lines of the test as a preview
4. Ask the user to confirm with an explicit Y/N

Only proceed if the user says yes.

## 6. Apply the team's conventions

Consult `.claude/CLAUDE.md` for team-specific test-file location, fixture-naming, or mock-style
conventions. The rules pipeline has already loaded matching rules from `.claude/rules/` into your
context — follow them.

**Where to pin the rule.** Write the test at the lowest layer that owns the behaviour
(`.claude/rules/quality/test-layering/test-layering.md`): a domain rule in the domain test, a parsing
rule in the parser test, an access rule in the server-boundary test. A test at an upper layer checks
only that it is wired to the layer below, by one path; it does not repeat the rule's cases. A defect
fix gets its test where the defect lived, not where it was seen.

## 7. Write the test file

Run:

```bash
${FRAMEWORK_SLUG} test write <target-path> <<'TEST_CONTENT_EOF'
<final test content>
TEST_CONTENT_EOF
```

The single-quoted heredoc delimiter (`'TEST_CONTENT_EOF'`) suppresses shell expansion, so a test
body containing `$`, backticks, or quotes is passed through unchanged. Do **not** pipe the body in
with `echo '<content>'`: a single apostrophe — an English contraction in a test name is enough —
closes the quote, and the rest of the body is then interpreted by the shell. See
`.claude/rules/security/owasp-top-10/a05-injection-shell.md`.

The write helper applies path-traversal, secret-scan and no-overwrite guards.

### If the helper refuses

Every refusal has a route forward. Take the one that matches the reason:

| Refusal | What to do |
|---------|------------|
| the content contains a secret-shaped string | Replace it with a placeholder (below) and re-run `test write`. Do **NOT** write the file with the Write tool instead — the refusal is the guard working, and the Write tool has no such guard. |
| the target path escapes the workspace | Re-resolve the path inside the workspace and re-run `test write`. Do **NOT** write the file with the Write tool instead — same reason. |
| the target file already exists | This skill never overwrites. Choose a different filename, or edit the existing file with Edit. |
| the content is larger than the input cap | Split the test into two files and write each with `test write`. |

The first two are security refusals: re-attempting them through the Write tool reaches the same
result with the guard removed, which is the only outcome the guard exists to prevent. You are
authoring the test body freehand, which is exactly where a fabricated fixture credential gets
invented — the guard is not optional just because the transport changed.

## Fixture credentials — placeholders only

Test fixtures that need credentials MUST use obviously-fake placeholders:

- `"PLACEHOLDER_API_KEY"`
- `"<<example-token>>"`
- `"sk-test-1234567890example"`

The runtime helper refuses to write content containing real-looking credentials. If you fabricate
something like `AKIA...` or `ghp_...` the write will fail.

## What this skill does NOT do

- It does NOT enforce coverage thresholds, and does not point you at anything that does. The
  retired Test Coverage Gate (#17 VP-03-F03) measured nothing — nothing invoked it and nothing
  wrote the report it read — so it was removed rather than wired up (#396). The capability
  re-enters only as one whole design under #432, which is parked, not promised. This skill stays
  narrow: it writes tests.
- It does NOT execute the tests after writing. Run them yourself with the team's standard command.
- It no longer generates test bodies. `${FRAMEWORK_SLUG} test scaffold` was retired: a
  cross-language code generator can only emit boilerplate and a placeholder, and every defect its
  review found sat in the code that tried to guess at your source rather than in the instruction
  above.
