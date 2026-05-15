// Installs a single bundled rule pack from templates/rules/<packName>/ to the
// workspace's .claude/rules/<packName>/. Applies brand-token substitution,
// runs scanSecrets on emitted content (AC6), refuses on hit. Refuses unknown
// packs (paths outside templates/rules/).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { substitute } from "../branding/substitute.js";
import { scanSecrets } from "../validate/secrets.js";
import { loadRules } from "./loader.js";
import { countInstructions } from "../validate/instruction-count.js";
export async function installRulePack(opts) {
    const slug = resolveBrandSlugSync();
    const installed = [];
    const skipped = [];
    const warnings = [];
    // Refuse path traversal / unknown pack roots.
    const packsRoot = resolve(opts.packageRoot, "templates", "rules");
    const packSource = resolve(packsRoot, opts.packName);
    if (!packSource.startsWith(packsRoot + sep)) {
        return { ok: false, error: `unknown rule pack: ${opts.packName}` };
    }
    // Verify the pack source exists before walking. The walker also reads from
    // sourceDir, but probing here lets us return a typed "unknown rule pack"
    // error rather than letting a downstream readdir throw.
    try {
        await stat(packSource);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return { ok: false, error: `unknown rule pack: ${opts.packName}` };
        }
        return { ok: false, error: err.message };
    }
    const packDest = join(opts.workspaceDir, ".claude", "rules", opts.packName);
    const secretHits = [];
    await copyTreeWithSubstitution(packSource, packDest, opts.brand, opts.onExisting, installed, skipped, secretHits);
    if (secretHits.length > 0) {
        return {
            ok: false,
            error: `refusing to install: ${secretHits.length} potential secret(s) detected in emitted content`,
            secretHits,
        };
    }
    // AC8: after install, count directives across ALL loaded rule bodies in the workspace.
    // Conservative: ignores glob filtering — if any rule's body lands in CLAUDE.md, its
    // directives count. Better to over-warn than under-warn.
    // Best-effort: a failure here MUST NOT propagate — the install already succeeded.
    const rulesDir = join(opts.workspaceDir, ".claude", "rules");
    try {
        const loaded = await loadRules(rulesDir);
        const totalBody = loaded.rules.map((r) => r.body).join("\n");
        const count = countInstructions(totalBody);
        if (count.warnLevel === "exceeded") {
            warnings.push(`directive budget EXCEEDED: ${count.count} RFC-2119 directives across installed rules ` +
                `(hard limit 150). \`${slug} rules apply\` will produce a CLAUDE.md that exceeds the ` +
                `Claude Code instruction-budget guidance (CS-02). Consider a smaller pack or per-language pruning.`);
        }
        else if (count.warnLevel === "warn") {
            warnings.push(`directive budget: ${count.count} RFC-2119 directives across installed rules ` +
                `(warn at 120, hard limit 150). Consider a smaller pack or per-language pruning.`);
        }
    }
    catch {
        warnings.push("directive budget: could not compute (error reading installed rules).");
    }
    return { ok: true, installed, skipped, warnings };
}
// Tree-copy walker with brand substitution + secret-scan.
//
// Known limitation (L1): writes are not atomic across the tree. If file N
// scans clean and is written, then file N+1 triggers a secret hit, file N
// is left on disk and the function returns ok:false. Callers should treat
// any failure as "rolled-back-or-not" and re-run with --replace once the
// source pack is fixed. A transactional rollback is out of scope for L1
// and tracked for future hardening alongside the cross-installer DRY refactor.
async function copyTreeWithSubstitution(sourceDir, destDir, brand, onExisting, installed, skipped, secretHits) {
    await mkdir(destDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = join(sourceDir, entry.name);
        const dst = join(destDir, entry.name);
        if (entry.isDirectory()) {
            await copyTreeWithSubstitution(src, dst, brand, onExisting, installed, skipped, secretHits);
            continue;
        }
        if (!entry.isFile())
            continue;
        if (onExisting === "abort" && (await fileExists(dst))) {
            skipped.push(dst);
            continue;
        }
        const raw = await readFile(src, "utf8");
        const substituted = substitute(raw, brand);
        const scan = scanSecrets(substituted);
        if (scan.hits.length > 0) {
            for (const hit of scan.hits)
                secretHits.push({ path: src, hit });
            continue; // do not write files that triggered a hit
        }
        await writeFile(dst, substituted, "utf8");
        installed.push(dst);
    }
}
async function fileExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=install-pack.js.map