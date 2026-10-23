// Installs a single bundled rule pack from templates/rules/<packName>/ to the
// workspace's .claude/rules/<packName>/. Applies brand-token substitution,
// runs scanSecrets on emitted content (AC6), refuses on hit. Refuses unknown
// packs (paths outside templates/rules/).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { substitute } from "../branding/substitute.js";
import { scanSecrets } from "../validate/secrets.js";
import { loadModeOf, loadRules } from "./loader.js";
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
    try {
        await copyTreeWithSubstitution(packSource, packDest, opts.brand, opts.onExisting, installed, skipped, secretHits, opts.backup);
    }
    catch (err) {
        // A failed backup stops the overwrite it was protecting.
        return { ok: false, error: err.message };
    }
    if (secretHits.length > 0) {
        return {
            ok: false,
            error: `refusing to install: ${secretHits.length} potential secret(s) detected in emitted content`,
            secretHits,
        };
    }
    // After install, count directives across the installed rules that
    // `rules apply` would inject (`load: inject` only — an on-disk rule
    // never reaches CLAUDE.md). Conservative: ignores glob filtering — better to
    // over-warn than under-warn.
    // Best-effort: a failure here MUST NOT propagate — the install already succeeded.
    const rulesDir = join(opts.workspaceDir, ".claude", "rules");
    try {
        const loaded = await loadRules(rulesDir);
        const totalBody = loaded.rules
            .filter((r) => loadModeOf(r) === "inject")
            .map((r) => r.body)
            .join("\n");
        const count = countInstructions(totalBody);
        if (count.warnLevel === "exceeded") {
            warnings.push(`directive budget EXCEEDED: ${count.count} RFC-2119 directives across installed \`load: inject\` rules ` +
                `(hard limit 150). \`${slug} rules apply\` will refuse to write CLAUDE.md until some of them ` +
                `are set to \`load: disk\` (CS-02).`);
        }
        else if (count.warnLevel === "warn") {
            warnings.push(`directive budget: ${count.count} RFC-2119 directives across installed \`load: inject\` rules ` +
                `(warn at 120, hard limit 150). Consider \`load: disk\` for a pack Claude Code can load from disk.`);
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
async function copyTreeWithSubstitution(sourceDir, destDir, brand, onExisting, installed, skipped, secretHits, backup) {
    await mkdir(destDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = join(sourceDir, entry.name);
        const dst = join(destDir, entry.name);
        if (entry.isDirectory()) {
            await copyTreeWithSubstitution(src, dst, brand, onExisting, installed, skipped, secretHits, backup);
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
        if (backup) {
            let current = null;
            try {
                current = await readFile(dst, "utf8");
            }
            catch (err) {
                // Only a missing file means nothing to back up; anything else stops
                // the overwrite (fail closed).
                if (err.code !== "ENOENT")
                    throw err;
                current = null;
            }
            if (current !== null && current !== substituted)
                await backup(dst);
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