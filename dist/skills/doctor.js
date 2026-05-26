// #239 (T0-1): `3c doctor` — read-only install & wiring diagnostic. Composes
// existing checks (branding, secret/instruction validators, arch config) into
// a single health report. Verifies the install-coherence fixes shipped in the
// L2-fix sprint (#240 hyphen namespace, #242 path-guard, #246 inert gate).
// Local-only — no network I/O.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadFramework, loadBrand, resolveBrand } from "../branding/load.js";
import { scanSecrets } from "../validate/secrets.js";
import { countInstructions } from "../validate/instruction-count.js";
import { loadArchConfig } from "./arch-boundary/config.js";
async function pathExists(p) {
    try {
        await stat(p);
        return true;
    }
    catch {
        return false;
    }
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
    // Brand + install mode (AC2).
    const framework = await loadFramework(packageRoot);
    const brand = resolveBrand(framework, await loadBrand(workspaceDir));
    const slug = brand.BRAND_SLUG;
    add("ok", "brand", `brand slug: ${slug} — commands install as /${slug}-<skill>`);
    if (await pathExists(join(workspaceDir, ".claude-plugin", "plugin.json"))) {
        add("warn", "install-mode", "a .claude-plugin/plugin.json is present — plugin install is unsupported (its commands would be colon-namespaced and mismatch the hyphen agent refs). Use the copy install.");
    }
    else {
        add("ok", "install-mode", "copy install (hyphen namespace).");
    }
    const skillsDir = join(workspaceDir, ".claude", "skills");
    const agentFiles = await walkFiles(join(workspaceDir, ".claude", "agents"));
    const files = [...(await walkFiles(skillsDir)), ...agentFiles];
    const contents = await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")]));
    // Unsubstituted brand/framework tokens (AC3).
    const TOKEN_RE = /\$\{(BRAND|FRAMEWORK)_[A-Z_]+\}/;
    const residue = contents.filter(([, t]) => TOKEN_RE.test(t)).map(([f]) => f);
    if (residue.length) {
        add("fail", "tokens", `unsubstituted brand tokens in ${residue.length} file(s): ${residue.join(", ")}`);
    }
    else {
        add("ok", "tokens", "no unsubstituted brand tokens in installed skills/agents.");
    }
    // Namespace coherence — no stale colon command refs (AC4).
    const colon = contents.filter(([, t]) => t.includes(`/${slug}:`)).map(([f]) => f);
    if (colon.length) {
        add("fail", "namespace", `stale colon command refs (/${slug}:…) in ${colon.length} file(s) — expected hyphen /${slug}-…: ${colon.join(", ")}`);
    }
    else {
        add("ok", "namespace", `commands use the hyphen namespace /${slug}-…`);
    }
    // Both hooks present (AC5).
    let pre = [];
    try {
        const parsed = JSON.parse(await readFile(join(workspaceDir, ".claude", "settings.json"), "utf8"));
        pre = parsed.hooks?.PreToolUse ?? [];
    }
    catch {
        pre = [];
    }
    const hasCmd = (matcher, needle) => pre.some((e) => e.matcher === matcher &&
        (e.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes(needle)));
    const hasOrchestrator = hasCmd("Bash", "hook run");
    const hasPathGuard = hasCmd("Read|Edit|Write", "hook path-guard");
    if (hasOrchestrator && hasPathGuard) {
        add("ok", "hooks", "both PreToolUse hooks registered (orchestrator + path-guard).");
    }
    else {
        const missing = [
            hasOrchestrator ? null : "Bash orchestrator",
            hasPathGuard ? null : "Read|Edit|Write path-guard",
        ].filter(Boolean);
        add("fail", "hooks", `missing hook(s): ${missing.join(", ")} — run \`${slug} hook install\`.`);
    }
    // CLAUDE.md instruction budget + secret scan (AC6).
    for (const p of [join(workspaceDir, "CLAUDE.md"), join(workspaceDir, ".claude", "CLAUDE.md")]) {
        if (!(await pathExists(p)))
            continue;
        const t = await readFile(p, "utf8");
        const c = countInstructions(t);
        if (c.warnLevel === "exceeded")
            add("fail", "claude-md", `CLAUDE.md has ${c.count} RFC-2119 directives (>150 hard limit).`);
        else if (c.warnLevel === "warn")
            add("warn", "claude-md", `CLAUDE.md has ${c.count} directives (warn ≥120).`);
        else
            add("ok", "claude-md", `CLAUDE.md: ${c.count} directives (within budget).`);
        if (scanSecrets(t).hits.length > 0)
            add("fail", "claude-md", "CLAUDE.md contains potential secret(s).");
        break;
    }
    // Inert boundary gate (AC8) — architect agent present but no active config.
    if (agentFiles.some((f) => f.endsWith("architect.md"))) {
        const cfg = await loadArchConfig(workspaceDir);
        if (!cfg) {
            add("warn", "arch-gate", `architect agent installed but the boundary gate has no active architecture.yaml — it is inert. Run \`${slug} arch-check init\` and define layers/deny.`);
        }
        else {
            add("ok", "arch-gate", "architecture boundary gate is configured.");
        }
    }
    return { findings, ok: findings.every((f) => f.level !== "fail") };
}
//# sourceMappingURL=doctor.js.map