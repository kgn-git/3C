// `3c doctor` — read-only install & wiring diagnostic. Composes existing
// checks (branding, secret/instruction validators, arch config) into a single
// health report covering install coherence (hyphen namespace, path-guard,
// inert gate). Local-only — no network I/O.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { loadFramework } from "../branding/load.js";
import { scanSecrets } from "../validate/secrets.js";
import { countInstructions } from "../validate/instruction-count.js";
import { stripFencedBlocks, exceedsSizeCap, MAX_DOC_BYTES, } from "../validate/_markdown.js";
import { archConfigPath, loadArchConfig } from "../validate/arch-config.js";
import { CLI_COMMANDS, RETIRED_COMMANDS, checkCliSkillCompat, referencedRetiredCommands, retiredVerbs, } from "./cli-compat.js";
async function pathExists(p) {
    try {
        await stat(p);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Bundled template path for an installed artefact, or null when the artefact is
 * not one of ours. Only `<slug>-` prefixed skills/agents are the framework's;
 * everything else in `.claude/` is the adopter's own and not ours to judge.
 */
function counterpartOf(rel, packageRoot, slug) {
    const parts = rel.split(/[\\/]/);
    if (parts[0] !== ".claude")
        return null;
    const prefix = `${slug}-`;
    const kind = parts[1] === "agents" ? "agents" : parts[1] === "skills" ? "skills" : null;
    if (kind === null || !parts[2]?.startsWith(prefix))
        return null;
    // `installAgents` writes FLAT into .claude/agents/, so anything deeper is the
    // adopter's own filing — including under a prefixed directory, which would
    // otherwise resolve to a template that never existed and earn a "delete it".
    if (kind === "agents" && parts.length !== 3)
        return null;
    const name = parts[2].slice(prefix.length);
    // An artefact named exactly `<slug>-` would resolve to templates/<kind> itself,
    // which exists — so a genuine orphan would be reported as still shipping.
    if (name === "")
        return null;
    const base = join(packageRoot, "templates", kind);
    // Skills are directories, so parts.slice(3) may be empty — that yields the
    // template DIRECTORY, which is what the orphan check needs. One mapping, not
    // two that can drift.
    const tail = [name, ...parts.slice(3)];
    const candidate = resolve(base, ...tail);
    // Containment assert (CWE-22). Components come from readdir basenames today,
    // so no escape is reachable — but that is the CALLER's invariant, and the rule
    // pack requires the check after resolution rather than trust before it.
    const root = resolve(base);
    if (candidate !== root && !candidate.startsWith(root + sep))
        return null;
    return candidate;
}
/**
 * Neutralise control characters before echoing an adopter-controlled path into
 * the report (CWE-117): a directory name may carry ANSI/CSI sequences or a
 * newline, and forge lines in doctor's output.
 */
function safePath(p) {
    // eslint-disable-next-line no-control-regex
    return p.replace(/[\u0000-\u001f\u007f]/g, "?");
}
async function walkFiles(dir) {
    const out = [];
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    }
    catch {
        return out;
    }
    for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory())
            out.push(...(await walkFiles(p)));
        else if (e.isFile())
            out.push(p);
    }
    return out;
}
export async function runDoctor(opts) {
    const { workspaceDir, packageRoot } = opts;
    const findings = [];
    const add = (level, check, message) => findings.push({ level, check, message });
    // Install mode (AC2).
    const framework = await loadFramework(packageRoot);
    // One identity. Custom branding is retired, so the installed prefix
    // (`/3c-test`, `.claude/skills/3c-test/`) and the CLI binary that skills
    // invoke (`3c test …`) are the same slug — one name, read from framework.json.
    const slug = framework.FRAMEWORK_SLUG;
    if (await pathExists(join(workspaceDir, ".claude-plugin", "plugin.json"))) {
        // The directory is inert — nothing reads it, and its only writer
        // (the retired white-label scaffolder) and only updater (the retired
        // `upgrade`) are both gone — so the honest instruction is to delete it.
        add("warn", "install-mode", "a .claude-plugin/ directory is present and nothing reads it — the plugin distribution path is retired (AD-16). " +
            "It is a leftover of a release before #396; nothing maintains it now. " +
            "Delete .claude-plugin/ — the copy install (hyphen namespace) is the only supported path.");
    }
    else {
        add("ok", "install-mode", "copy install (hyphen namespace).");
    }
    const skillsDir = join(workspaceDir, ".claude", "skills");
    const agentFiles = await walkFiles(join(workspaceDir, ".claude", "agents"));
    const files = [...(await walkFiles(skillsDir)), ...agentFiles];
    const contents = await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")]));
    // Skill↔CLI version-compat: installed skills that invoke a command the running
    // CLI lacks mean the binary on PATH is older than the installed skills.
    const supported = opts.supportedCommands ?? CLI_COMMANDS;
    const skillTexts = contents.map(([f, t]) => ({ name: f.split(/[\\/]/).pop() ?? f, text: t }));
    const retiredSet = opts.retiredCommands ?? RETIRED_COMMANDS;
    const verbsRetired = retiredVerbs(retiredSet);
    // A RETIRED verb is not an "old CLI" — it is a new one. Subtracting them here
    // is what routes them to the retired-command check below, which names the
    // repair that works, instead of telling an adopter who has just upgraded to
    // upgrade again.
    const incompat = checkCliSkillCompat(skillTexts, slug, supported).filter((i) => !verbsRetired.has(i.command));
    if (incompat.length) {
        const cmds = [...new Set(incompat.map((i) => i.command))].join(", ");
        add("fail", "cli-compat", `installed skills/agents invoke CLI command(s) [${cmds}] your \`${slug}\` binary doesn't provide — the CLI on PATH is older than the installed skills. Upgrade/reinstall: npm install -g --allow-git=root git+https://github.com/kgn-git/3C.git#<release-sha> (the commit sha from the release notes) (and check \`Get-Command ${slug}\` / \`which ${slug}\` for a stale shadowing copy).`);
    }
    else {
        add("ok", "cli-compat", "installed skills only invoke commands the running CLI supports.");
    }
    // Retired subcommands — the INVERSE skew to cli-compat above.
    //
    // A retirement moves enforcement out of a CLI verb (which upgrades with npm)
    // and into copy-installed markdown (which does not: installSkills skips
    // existing files, installAgents aborts). So the adopter's CLI is NEWER than
    // their artefacts, and `referencedCliCommands` cannot see it because it reads
    // only the top-level verb — `3c test scaffold` resolves to the still-valid
    // `test`. Deny-list driven.
    const retiredHits = [];
    const unscannable = [];
    let needsReplaceCaution = false;
    for (const [f, t] of contents) {
        const rel = relative(workspaceDir, f);
        // Above the shared cap, report the file as UNSCANNED rather than letting an
        // unexamined file count as clean. Note what this does and does not do: it
        // bounds the regex scan, not the read — every file under `.claude/` is
        // already in memory from the Promise.all above, which predates this check.
        if (exceedsSizeCap(t)) {
            unscannable.push(safePath(rel));
            continue;
        }
        const cmds = referencedRetiredCommands(t, slug, retiredSet);
        if (cmds.size === 0)
            continue;
        const counterpart = counterpartOf(rel, packageRoot, slug);
        const isAgent = rel.split(/[\\/]/)[1] === "agents";
        // D3: `--replace` only ever writes files that still ship upstream. Offering
        // it for an orphan sends the adopter to a permanently-red doctor. Each
        // branch carries its own repair AND its own cause — the version-skew story
        // is true only for the third.
        let repair;
        if (counterpart === null) {
            repair = "you authored this file — edit it yourself";
        }
        else if (!(await pathExists(counterpart))) {
            repair = "no longer ships upstream — remove it by hand";
        }
        else {
            repair = `run \`${slug} ${isAgent ? "agents" : "skills"} install --replace\``;
            needsReplaceCaution = true;
        }
        retiredHits.push(`${safePath(rel)} → [${[...cmds].join(", ")}] (${repair})`);
    }
    if (retiredHits.length || unscannable.length) {
        const parts = [];
        if (retiredHits.length) {
            parts.push(`installed artefact(s) invoke RETIRED command(s): ${retiredHits.join("; ")}`);
        }
        if (unscannable.length) {
            parts.push(`could not scan (over ${MAX_DOC_BYTES} bytes, so NOT verified clean): ${unscannable.join(", ")}`);
        }
        if (needsReplaceCaution) {
            parts.push("where the repair is `--replace`, your `" +
                slug +
                "` binary is NEWER than the file: the command was removed and the replacement never arrived. `--replace` overwrites every skill/agent that still ships upstream — commit `.claude/` first, then review `git diff .claude/`");
        }
        // A confirmed stale invocation is a hard failure. A file merely too large to
        // read is unverified, not broken — reported, but not a permanently-red gate
        // for a condition the adopter may have no way to change (same reasoning as
        // the orphan branch: a doctor that is always red stops being read).
        add(retiredHits.length ? "fail" : "warn", "retired-command", parts.join(". ") + ".");
    }
    else {
        add("ok", "retired-command", "no installed artefact invokes a retired command.");
    }
    // Orphaned framework artefacts — installed under our prefix but
    // with no counterpart in the bundled templates. No installer ever visits
    // these: installSkills/installAgents iterate the SOURCE tree only, so nothing
    // in the CLI can clear them. Report the path; never delete.
    const orphans = [];
    let scanFailed = "";
    let skillDirs = [];
    try {
        skillDirs = await readdir(skillsDir, { withFileTypes: true });
    }
    catch (err) {
        // ENOENT is "no skills installed" — a legitimate clean state. Anything else
        // means we did not look, and must not be reported as "nothing to find" (A10).
        const code = err.code;
        if (code !== "ENOENT")
            scanFailed = code ?? "unknown error";
    }
    for (const dir of skillDirs) {
        if (!dir.isDirectory())
            continue;
        const rel = join(".claude", "skills", dir.name);
        const counterpart = counterpartOf(rel, packageRoot, slug);
        if (counterpart === null)
            continue; // not ours
        if (!(await pathExists(counterpart)))
            orphans.push(safePath(rel));
    }
    for (const f of agentFiles) {
        // From the RECURSIVE walk, so keep the real relative path: rebuilding it
        // from the basename reports `.claude/agents/x.md` for a nested file and
        // tells the adopter to delete a path that does not exist.
        const rel = relative(workspaceDir, f);
        const counterpart = counterpartOf(rel, packageRoot, slug);
        if (counterpart === null)
            continue;
        if (!(await pathExists(counterpart)))
            orphans.push(safePath(rel));
    }
    if (scanFailed) {
        add("warn", "orphaned", `could not read ${join(".claude", "skills")} (${scanFailed}) — orphaned-artefact check did not run.`);
    }
    else if (orphans.length) {
        add("warn", "orphaned", `installed artefact(s) no longer ship with this framework version: ${orphans.join(", ")}. Nothing in the CLI writes or clears these — remove them by hand once you have confirmed nothing local depends on them.`);
    }
    else {
        add("ok", "orphaned", "every installed framework artefact still ships upstream.");
    }
    // Unsubstituted brand/framework tokens (AC3).
    //
    // A token can appear two ways. USED — a placeholder that install should
    // have substituted (`${FRAMEWORK_SLUG} agents install`), which is the defect
    // this check exists to catch. NAMED — prose documenting the AD-16
    // substitution model itself, e.g. a line defining what `${FRAMEWORK_NAME}`
    // resolves to, where substituting would destroy the meaning by replacing the
    // term being defined with its own value. A regex cannot tell them apart, so
    // a file that legitimately documents the model opts out explicitly with the
    // marker below. Deny-by-default: the opt-out must be added deliberately, and
    // it is reported, because an exemption nobody can see is how a check rots.
    const TOKEN_RE = /\$\{(BRAND|FRAMEWORK)_[A-Z_]+\}/g;
    // The marker must NAME the tokens it excuses:
    //   <!-- 3c-doctor: allow-brand-tokens FRAMEWORK_NAME BRAND_NAME — why -->
    // A blanket per-file opt-out would also silence a typo'd token
    // (`${BRAND_SLUGG}`, which substitute() leaves behind untouched) in exactly
    // the files most likely to write tokens by hand. Declaring the set keeps that
    // detection alive. The rationale rides in the same comment so it cannot drift
    // away from what it explains.
    //
    // Matched outside fenced blocks (the shared markdown helper): otherwise a file that
    // merely SHOWS the marker in an example would silently exempt itself.
    const MARKER_RE = /<!--\s*3c-doctor:\s*allow-brand-tokens([^>]*?)-->/;
    const declaredIn = (text) => {
        const marker = MARKER_RE.exec(stripFencedBlocks(text));
        if (!marker)
            return new Set();
        return new Set((marker[1] ?? "").match(/\b(?:BRAND|FRAMEWORK)_[A-Z_]+\b/g) ?? []);
    };
    const tokenOffenders = [];
    const tokenExempt = [];
    for (const [f, t] of contents) {
        const found = [...t.matchAll(TOKEN_RE)].map((m) => m[0].slice(2, -1));
        if (found.length === 0)
            continue;
        const declared = declaredIn(t);
        const undeclared = found.filter((name) => !declared.has(name));
        if (undeclared.length)
            tokenOffenders.push(`${f} (${[...new Set(undeclared)].join(", ")})`);
        else
            tokenExempt.push(f);
    }
    const exemptNote = tokenExempt.length
        ? ` (exempt by marker: ${tokenExempt.join(", ")})`
        : "";
    if (tokenOffenders.length) {
        add("fail", "tokens", `unsubstituted brand tokens in ${tokenOffenders.length} file(s): ${tokenOffenders.join("; ")}${exemptNote}`);
    }
    else {
        add("ok", "tokens", `no unsubstituted brand tokens in installed skills/agents${exemptNote}.`);
    }
    // Namespace coherence — no stale colon command refs (AC4).
    const colon = contents.filter(([, t]) => t.includes(`/${slug}:`)).map(([f]) => f);
    if (colon.length) {
        add("fail", "namespace", `stale colon command refs (/${slug}:…) in ${colon.length} file(s) — expected hyphen /${slug}-…: ${colon.join(", ")}`);
    }
    else {
        add("ok", "namespace", `commands use the hyphen namespace /${slug}-…`);
    }
    // All registered hooks present (PreToolUse and PostToolUse).
    let pre = [];
    let post = [];
    try {
        const parsed = JSON.parse(await readFile(join(workspaceDir, ".claude", "settings.json"), "utf8"));
        pre = parsed.hooks?.PreToolUse ?? [];
        post = parsed.hooks?.PostToolUse ?? [];
    }
    catch {
        pre = [];
        post = [];
    }
    const hasCmd = (matcher, needle) => pre.some((e) => e.matcher === matcher &&
        (e.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes(needle)));
    const hasOrchestrator = hasCmd("Bash", "hook run");
    const hasPathGuard = hasCmd("Read|Edit|Write", "hook path-guard");
    // Keyed on OUR command, not on the event key. An adopter may run other
    // people's PostToolUse hooks; the presence of one says nothing about whether
    // post-edit validation is registered. Doctor is the only route by which an
    // existing install learns it must re-register.
    // Matcher AND command, like the PreToolUse probes above: an entry carrying
    // our command under a matcher that never fires on an edit is a registration
    // that does nothing, and must not be reported as health.
    const hasPostEdit = post.some((e) => typeof e.matcher === "string" &&
        e.matcher.split("|").includes("Edit") &&
        (e.hooks ?? []).some((h) => typeof h.command === "string" &&
            h.command.includes("hook run") &&
            h.command.includes("--event=PostToolUse")));
    if (hasOrchestrator && hasPathGuard && hasPostEdit) {
        add("ok", "hooks", "hooks registered: Bash orchestrator + path-guard (PreToolUse), post-edit validation (PostToolUse).");
    }
    else {
        const missing = [
            hasOrchestrator ? null : "Bash orchestrator",
            hasPathGuard ? null : "Read|Edit|Write path-guard",
            hasPostEdit ? null : "PostToolUse post-edit validation",
        ].filter(Boolean);
        add("fail", "hooks", `missing hook(s): ${missing.join(", ")} — run \`${slug} hook install\`.`);
    }
    // CLAUDE.md instruction budget + secret scan (AC6).
    for (const p of [join(workspaceDir, "CLAUDE.md"), join(workspaceDir, ".claude", "CLAUDE.md")]) {
        if (!(await pathExists(p)))
            continue;
        const t = await readFile(p, "utf8");
        const c = countInstructions(t);
        // Only a file carrying an injected rules block can be shrunk by
        // `rules apply`; anything else (a root CLAUDE.md, which apply never
        // writes) is the adopter's own text to trim.
        const remedy = t.includes(":RULES-BEGIN")
            ? `set \`load: disk\` on injected rule packs and re-run \`${slug} rules apply\`, or trim CLAUDE.md`
            : "trim CLAUDE.md";
        if (c.warnLevel === "exceeded")
            add("fail", "claude-md", `CLAUDE.md has ${c.count} RFC-2119 directives (limit: under 150) — ${remedy}.`);
        else if (c.warnLevel === "warn")
            add("warn", "claude-md", `CLAUDE.md has ${c.count} directives (warn ≥120).`);
        else
            add("ok", "claude-md", `CLAUDE.md: ${c.count} directives (within budget).`);
        if (scanSecrets(t).hits.length > 0)
            add("fail", "claude-md", "CLAUDE.md contains potential secret(s).");
        break;
    }
    // Inert boundary gate — the config is load-bearing for the gate itself
    // (layer-boundary is the sole post-edit rule, and the commit-gate check
    // reads the same file), so the advisory does not key on the architect
    // agent's presence. Severity stays `warn`: doctor's exit code is a contract
    // (`{argv:["doctor"],codes:[0]}` at the capability tier).
    {
        // The loader answers WHICH state it found, so each state gets its own
        // report. A config that fails to parse must not get the starter's lead
        // repair: `discover` REWRITES the file, which would steer an adopter into
        // losing their own rules. The path comes from the loader's own export, so
        // the probe and the loader agree about which file they mean. `slug`
        // remains right for the COMMAND names in the message.
        const loaded = await loadArchConfig(workspaceDir);
        const cfgPath = archConfigPath(workspaceDir);
        if (loaded.kind === "malformed") {
            // `fail`, not `warn`: this state blocks the adopter's very next commit.
            // A warning would undersell a gate that is already refusing to run.
            add("fail", "arch-gate", `${cfgPath} exists but does not parse or validate (${loaded.detail}) — the boundary gate fails closed, so \`${slug} arch-check check\` will block. Open that file and fix it. Do NOT run \`${slug} arch-check discover\` expecting a repair: it now leaves a broken active config untouched and writes to architecture.proposed.yaml instead, so your rules are still there.`);
        }
        else if (loaded.kind === "inert" && loaded.declared) {
            // Parses, layers named, no deny pair — one command after `discover` can
            // have said the same file blocks nothing. "Configured" was a false
            // all-clear here.
            add("warn", "arch-gate", `${cfgPath} declares layers but no \`deny\` pair, so the boundary gate enforces nothing. Add the pairs you want blocked — the file carries a worked example — then check with \`${slug} arch-check check\`.`);
        }
        else if (loaded.kind === "inert") {
            // After `setup` the file EXISTS as the inert starter, and
            // `arch-check init` would answer "already exists — left unchanged" — a
            // no-op must not be the advertised repair, so the routes differ by state.
            add("warn", "arch-gate", `${cfgPath} declares no layers the gate can read — it is inert. Normal for the scaffolded starter, which parses to nothing. Run \`${slug} arch-check discover\` to draft layers/deny from the import graph (it replaces this starter), or define them by hand there — the starter and drafted files include a worked example.`);
        }
        else if (loaded.kind === "absent") {
            add("warn", "arch-gate", `the boundary gate has no architecture.yaml — it is inert. Run \`${slug} arch-check init\` and define layers/deny, or \`${slug} arch-check discover\` to draft them from the import graph.`);
        }
        else {
            add("ok", "arch-gate", "architecture boundary gate is configured.");
        }
    }
    // Crew presence + agent naming.
    const EXPECTED_ROLES = [
        "architect", "code-reviewer", "security-reviewer", "test-author",
        "product-owner", "ux-expert", "qa-reviewer", "journey-architect",
    ];
    if (agentFiles.length > 0) {
        const names = agentFiles.map((f) => f.split(/[\\/]/).pop() ?? "");
        const missing = EXPECTED_ROLES.filter((r) => !names.includes(`${slug}-${r}.md`));
        const staleBare = EXPECTED_ROLES.filter((r) => names.includes(`${r}.md`));
        if (missing.length === 0) {
            add("ok", "crew", `all ${EXPECTED_ROLES.length} specialist agents present and ${slug}-prefixed.`);
        }
        else {
            add("warn", "crew", `${EXPECTED_ROLES.length - missing.length}/${EXPECTED_ROLES.length} specialist agents present; missing: ${missing.join(", ")}.`);
        }
        if (staleBare.length > 0) {
            add("warn", "crew", `stale bare-name agent file(s) (pre-rename): ${staleBare.map((r) => `${r}.md`).join(", ")} — remove them; use ${slug}-<role>.md.`);
        }
    }
    // Orchestrator skills — report when present.
    for (const orch of ["review-board", "project-manager"]) {
        if (await pathExists(join(workspaceDir, ".claude", "skills", `${slug}-${orch}`, "SKILL.md"))) {
            add("ok", "orchestrators", `${slug}-${orch} orchestrator skill present.`);
        }
    }
    // The pipeline's ship step renders its handover from this template.
    if (await pathExists(join(workspaceDir, ".claude", "skills", `${slug}-project-manager`, "SKILL.md"))) {
        const template = join(workspaceDir, ".github", "ISSUE_TEMPLATE", "handover.md");
        if (await pathExists(template)) {
            // The label is what the dashboard queries; a template without it files issues nothing reads.
            const line = /^labels:(.*)$/m.exec(await readFile(template, "utf8").catch(() => ""))?.[1] ?? "";
            const labelled = line.split(/[\s,[\]"']+/).includes("handover");
            if (labelled)
                add("ok", "handover-template", ".github/ISSUE_TEMPLATE/handover.md present.");
            else
                add("warn", "handover-template", `.github/ISSUE_TEMPLATE/handover.md lacks \`labels: handover\`, so issues filed from it are not read — run \`${slug} setup --replace\`.`);
        }
        else {
            add("warn", "handover-template", `.github/ISSUE_TEMPLATE/handover.md is missing, so the ship step has no handover form — run \`${slug} setup\`.`);
        }
    }
    // Fill-in rule packs ship `{{NAME}}` blanks the adopter replaces. A warning,
    // never a failure: an unfilled blank weakens a rule, it does not break one.
    const ruleFiles = (await walkFiles(join(workspaceDir, ".claude", "rules"))).filter((f) => f.endsWith(".md"));
    const blanks = [];
    for (const f of ruleFiles) {
        // Outside fenced blocks: a token shown in an example is not a blank.
        const text = stripFencedBlocks(await readFile(f, "utf8").catch(() => ""));
        const found = [...new Set(text.match(/\{\{[A-Z][A-Z_]*\}\}/g) ?? [])];
        if (found.length > 0)
            blanks.push(`${relative(workspaceDir, f).split(sep).join("/")} (${found.join(", ")})`);
    }
    if (blanks.length > 0) {
        add("warn", "rule-blanks", `installed rules still hold blanks to fill in — edit ${blanks.join("; ")}, replacing each token with this project's value.`);
    }
    else if (ruleFiles.length > 0) {
        add("ok", "rule-blanks", "no unfilled blanks in the installed rules.");
    }
    // Optional retrospective skill.
    if (await pathExists(join(workspaceDir, ".claude", "skills", `${slug}-retrospective`, "SKILL.md"))) {
        add("ok", "retrospective", `${slug}-retrospective skill present (optional post-ship retro).`);
    }
    return { findings, ok: findings.every((f) => f.level !== "fail") };
}
//# sourceMappingURL=doctor.js.map