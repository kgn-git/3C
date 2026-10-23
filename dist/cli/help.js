export const HELP_TEMPLATE = `
\${BRAND_NAME} — \${BRAND_LONG}

Usage:
  \${FRAMEWORK_SLUG} <command> [options]

Commands:
  setup [--yes] [--replace]
                    One-shot install: CLAUDE.md + the rule packs listed under
                    \`rules install\` + hook + skills + agents + inert
                    arch-check, then a doctor verify.
                    A thin sequencer over the individual commands below. Re-runs
                    ADD what is missing and skip what exists; pass \`--replace\`
                    to refresh skills/agents that CHANGED upstream (it overwrites
                    your edits). \`--yes\` is non-interactive. (Alias: \`init --all\`.)
                    Every \`--replace\` (here and below) first backs up each
                    file it overwrites to .\${BRAND_SLUG}/backups/<timestamp>/.

  init [options]    Initialize CLAUDE.md for this project
                      --yes              Use defaults; no prompts
                      --at-root          Write to ./CLAUDE.md (default is ./.claude/CLAUDE.md)
                      --replace          Overwrite if file exists
                      --merge            Backup-and-overwrite (writes .pre-\${BRAND_SLUG}.bak)
                      --no-companion     Skip CLAUDE.local.md.example + .gitignore update

  rules apply       Validate .claude/rules/**/*.md and inject the rules marked
                    \`load: inject\` whose globs match workspace files into
                    CLAUDE.md. Rules marked \`load: disk\` (the default) stay
                    in .claude/rules/, which Claude Code loads on its own;
                    CLAUDE.md names those packs. Refuses to write a CLAUDE.md
                    of 150 or more directives. Re-runnable; replaces the
                    previous rules block in place.

  rules install <pack> [--replace]
                    Install a bundled rule pack into .claude/rules/<pack>/.
                    On disk: quality/file-size-and-comments,
                    quality/test-layering, security/cwe-top-25-2025,
                    security/owasp-top-10, ux/tone-and-manner.
                    Injected: patterns/clean-architecture, patterns/hexagonal,
                    patterns/layered-mvc, patterns/microservices,
                    patterns/modular-monolith.
                    \`setup\` installs: quality/file-size-and-comments,
                    quality/test-layering, security/cwe-top-25-2025,
                    security/owasp-top-10, ux/tone-and-manner.
                    Run \`rules apply\` afterwards.

  hook install      Register the \${BRAND_NAME} hooks in .claude/settings.json:
                    the PreToolUse commit gate and path-guard, and the
                    PostToolUse post-edit check. Safe to re-run — it adds what
                    is missing and leaves other tools' entries alone.

  hook run [--event=<event>]
                    Internal — invoked by Claude Code via the registered
                    hook. Reads the event payload from stdin. On PreToolUse it
                    runs the configured chain from .\${BRAND_SLUG}/hooks.yaml;
                    on PostToolUse it runs the post-edit boundary check, which
                    is advisory and never blocks the edit.

  hook confirm      Interactive — review the unified diff of recent
                    .\${BRAND_SLUG}/hooks.yaml changes and accept (or reject) it.
                    Run this after editing hooks.yaml; \`hook run\` refuses
                    to proceed on unconfirmed changes.

  bypass --reason=<reason>
                    Skip the hook chain for the next commit only. Logged.

  skills install [--replace]
                    Copy bundled skill artefacts (SKILL.md, templates)
                    into ./.claude/skills/. Honours \${BRAND_*} substitution.

  agents install [--replace]
                    Copy bundled subagent artefacts (templates/agents/*.md)
                    into ./.claude/agents/. Honours \${BRAND_*} substitution.
                    Installs the 3C crew: architect, code-reviewer,
                    journey-architect, product-owner, qa-reviewer,
                    security-reviewer, test-author, ux-expert.

  skills list       List installed skills (user-invoked slash commands).
  agents list       List installed agents (dispatched workers, NOT slash
                    commands). See https://kgn-git.github.io/3C/skills-vs-agents.html

  doctor            Read-only install & wiring diagnostic: brand slug, install
                    mode, token residue, hyphen-namespace coherence, every
                    registered hook (PreToolUse and PostToolUse), CLAUDE.md
                    budget, inert boundary gate. Exit 1 if blocking.

  test select [--files=a,b] [--base=<ref>] [--json]
                    Print the command(s) the TDD loop should run for the
                    current changeset, and why. Sources go to the runner's
                    related-mode; inputs that tests READ rather than import
                    are resolved via .\${BRAND_SLUG}/test-map.json. Anything
                    unmapped, or any failure to read the changeset from git,
                    widens the run to the full suite: a narrowed run never
                    reports green on tests it did not run. Inner loop only —
                    the pre-PR gate always runs everything.

  test write <target-path>
                    Read content from stdin, write to target-path with
                    secret-scan + path-traversal + no-overwrite guards.

  test detect-framework [<workspace>]
                    Internal — the runner resolution \`test select\` performs
                    in-process, exposed as a verb for the /\${BRAND_SLUG}-test
                    and /\${BRAND_SLUG}-implement skills. Prints the detected
                    framework (vitest|jest|mocha|playwright|pytest|junit|unknown)
                    as JSON. Exit 0 on known, 1 on unknown.

  create-issue [--force]
                    Internal — runtime helper for the create-issue skill.
                    Reads an IssuePayload JSON object from stdin, runs
                    preflight checks, and shells out to \`gh issue create\`.

  implement fetch-issue <id> [--repo=<owner/name>]
                    Internal — fetch an issue via \`gh issue view --json\`
                    and emit FetchedIssue JSON on stdout. Used by
                    /\${BRAND_SLUG}-implement for AC1.

  implement file-handover
                    Internal — read a handover body from stdin and file it as
                    a closed \`handover\`-labelled issue. Refuses a body whose
                    leading 3c-handover/1 block does not validate or that
                    matches a secret pattern; finds an already-filed handover
                    instead of filing it twice; on failure prints the gh
                    commands that finish the job by hand.

  implement create-pr [--force]
                    Internal — read a PrPayload JSON from stdin, run
                    AC8 scanSecrets preflight, and shell to
                    \`gh pr create\`. Emits PR URL + number on success.

  implement branch-name
                    Internal — read {"id":N,"title":"..."} JSON from
                    stdin, apply formatBranchName with optional
                    .\${BRAND_SLUG}/skills/implement.yaml override, print the
                    branch name to stdout.

  scan-secrets      Internal — read text from stdin and emit
                    {"hits":[{"type","match","redacted"}, ...]} JSON
                    to stdout. Exits 0 even on a hit, so /\${BRAND_SLUG}-review
                    and /\${BRAND_SLUG}-implement can redact and continue;
                    pass --fail-on-hit to exit 1 instead, for hooks and
                    scripts that gate on the exit status.

  security scan [--base=<ref>]      Scan the change for leaked secrets and
                    added dependencies with known advisories. Reads unstaged,
                    staged, untracked and committed-since-merge-base files;
                    fails closed if the tree cannot be read.
  security suppress <id>            Record an accepted finding so it stops
                    blocking. Suppressions are local to this workspace.

  dashboard [--serve] [--port <n>] [--since <date>]
                    Delivery view built from handover frontmatter: issues
                    shipped, cycle time, board verdicts. Writes a static
                    .\${BRAND_SLUG}/dashboard.html, or serves it on loopback
                    with --serve.

  debug context [file]              Print what the assistant reads for a
                    file — the rules, standards and architecture in scope —
                    so an unexpected suggestion can be traced to its source.

  bug --summary "<s>" --repro "<r>" --expected "<e>" --actual "<a>"
      [--env "<e>"] [--attach <path>]
                    File a structured bug report against this project.
                    Secrets are redacted from every field before it is sent.

  arch-check check [--files a,b]   Block cross-boundary import violations
                    per .\${BRAND_SLUG}/architecture.yaml (monorepo-aware).
                    Exit 0 clean or not configured, 1 could not evaluate
                    (config or file list), 2 violations.
  arch-check init   Scaffold a starter .\${BRAND_SLUG}/architecture.yaml
                    (inert until you define layers/deny).
  arch-check discover   Draft .\${BRAND_SLUG}/architecture.yaml from the
                    repository's actual import graph (proposal-only when an
                    active config exists).
  arch-check except "<from>-><to>" --reason="..." --expires=<date>
                    Record a time-boxed boundary exception (expiry mandatory).

  reconcile [--file <path>]         Internal — invoked by the
                    /\${BRAND_SLUG}-review-board skill. Reads multi-agent review
                    findings JSON from stdin (or --file) and emits the
                    deterministic de-duped, ranked board verdict.
  deps order [--file <path>]        Internal — dependency-ordered issue
                    sequence, used by /\${BRAND_SLUG}-programme-manager.

  onboard [--user <n>] [--level <l>] [--role <frontend|backend|devops>]
          [--advance|--ask "<q>"|--starter]
                    Guided onboarding: roadmap + per-developer progress
                    (pause/resume), local answers, starter-task suggestion.
                    --role appends role modules to the project-derived roadmap
                    and is remembered, so resuming needs no flag.

  --version         Show version
  --help            Show this help

Documentation: https://kgn-git.github.io/3C/
`.trim();
//# sourceMappingURL=help.js.map