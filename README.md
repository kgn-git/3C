# 3C — Claude Code Coach

> Public release repo. Source of truth: [`kgn-git/praise`](https://github.com/kgn-git/praise).

This repo contains only the runtime-installable surface of 3C v1.0.0: built `dist/`, deployable `templates/`, the Claude Code plugin manifest, `framework.json`, and the deployment branding template.

## Install

```bash
npm install git+https://github.com/kgn-git/3C#v1.0.0
```

Then in your project root:

```bash
3c init                  # generate .claude/CLAUDE.md from team interview
3c rules install <pack>  # OWASP Top 10, Clean Arch, Hexagonal, Layered MVC
3c hook install          # register pre-commit hook in .claude/settings.json
3c skills install        # drop the workflow skills into .claude/skills/
3c agents install        # drop the starter subagents into .claude/agents/
```

## Where to file issues

This repo is publish-only. For bugs, feature requests, and contributions, go to the upstream dev repo: [github.com/kgn-git/praise](https://github.com/kgn-git/praise).

## License

[MIT](LICENSE).
