# 3C — Claude Code Coach

> Public release repo. Source of truth: [`kgn-git/praise`](https://github.com/kgn-git/praise).

This repo contains only the runtime-installable surface of 3C v2.3.1: built `dist/`, deployable `templates/`, and `framework.json`.

3C installs by **copying** skills, agents, rules, and hooks into your project's `.claude/` (the copy path), so your team owns and evolves them in git. Commands are namespaced with a **hyphen prefix** — `/3c-<skill>`. (There is no plugin/colon install.)

## Install

```bash
npm install --allow-git=root git+https://github.com/kgn-git/3C.git#<release-sha>   # the v2.3.1 commit sha, from github.com/kgn-git/3C/releases
```

npm 12 refuses a git dependency unless you allow it, and stops with `EALLOWGIT`. Pass `--allow-git=root`, as the command above does: it allows the git dependencies your own `package.json` names and none further down the tree. npm 10 and 11 accept it without a warning. Later `npm ci` runs need the same permission, so add `allow-git=root` to the project's `.npmrc`.

Then in your project root, provision everything in one shot:

```bash
3c setup                 # CLAUDE.md + rules + hook + skills + agents + an architecture map from your code, then doctor
```

`3c setup` is a thin sequencer over the individual commands — each step is still independently runnable. Use `3c setup --yes` for a non-interactive run. To run the steps yourself instead:

```bash
3c init                  # generate .claude/CLAUDE.md
3c rules install <pack>  # OWASP Top 10, Clean Arch, Hexagonal, Layered MVC
3c hook install          # register pre-commit + path-guard hooks in .claude/settings.json
3c skills install        # drop the workflow skills into .claude/skills/ (as /3c-<skill>)
3c agents install        # drop the starter subagents into .claude/agents/
3c arch-check init       # scaffold a starter .3c/architecture.yaml (boundary gate)
3c doctor                # verify the install is coherent
```

## Update to latest

Upgrading the package does **not** rewrite the skills, agents and rules already copied into a project — those are yours, under your git, and the installer skips every file that already exists. So a skill whose contents changed upstream, or one that invokes a command since **retired**, stays exactly as it was. Refresh them explicitly:

```bash
git add -A .claude && git commit -m "checkpoint before upgrade"
npm install --allow-git=root git+https://github.com/kgn-git/3C.git#<release-sha>   # the v2.3.1 commit sha, from github.com/kgn-git/3C/releases
3c setup --replace       # refreshes CHANGED skills/agents, not just missing ones
git diff HEAD -- .claude         # review; re-apply any local edits
3c doctor                # confirms the installed artefacts match the upgraded CLI
```

`--replace` overwrites every skill and agent that still ships upstream, which is why the commit comes first.

`3c doctor` reports both directions of skew, and they need opposite repairs: a skill invoking a command your CLI lacks means the **CLI is older** — upgrade it; a skill invoking a **retired** command means the CLI is newer than your files — re-install with `--replace`. It also names **orphaned** skills and agents that no longer ship at all; no install command can clear those, so delete them by hand.

## Where to file issues

This repo is publish-only. For bugs, feature requests, and contributions, go to the upstream dev repo: [github.com/kgn-git/praise](https://github.com/kgn-git/praise).

## License

[MIT](LICENSE).
