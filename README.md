# 3C — Claude Code Coach

> Public release repo. Source of truth: [`kgn-git/praise`](https://github.com/kgn-git/praise).

This repo contains only the runtime-installable surface of 3C v1.7.0: built `dist/`, deployable `templates/`, `framework.json`, and the deployment branding template.

3C installs by **copying** skills, agents, rules, and hooks into your project's `.claude/` (the copy path), so your team owns and evolves them in git. Commands are namespaced with a **hyphen prefix** — `/3c-<skill>` by default, or `/<brand>-<skill>` if you set a custom namespace at `3c init`. (There is no plugin/colon install.)

## Install

```bash
npm install git+https://github.com/kgn-git/3C#v1.7.0
```

Then in your project root, provision everything in one shot:

```bash
3c setup                 # CLAUDE.md + rules + hook + skills + agents + arch-check, then doctor
```

`3c setup` is a thin sequencer over the individual commands — re-runs are idempotent and each step is still independently runnable. Use `3c setup --yes` for a non-interactive run. To run the steps yourself instead:

```bash
3c init                  # generate .claude/CLAUDE.md (+ optional namespace rebrand prompt)
3c rules install <pack>  # OWASP Top 10, Clean Arch, Hexagonal, Layered MVC
3c hook install          # register pre-commit + path-guard hooks in .claude/settings.json
3c skills install        # drop the workflow skills into .claude/skills/ (as /3c-<skill>)
3c agents install        # drop the starter subagents into .claude/agents/
3c arch-check init       # scaffold a starter .3c/architecture.yaml (boundary gate)
3c doctor                # verify the install is coherent
```

## Where to file issues

This repo is publish-only. For bugs, feature requests, and contributions, go to the upstream dev repo: [github.com/kgn-git/praise](https://github.com/kgn-git/praise).

## License

[MIT](LICENSE).
