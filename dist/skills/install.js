// Copies bundled skill artefacts (templates/skills/<name>/...) into the
// user's `.claude/skills/<name>/` directory, applying brand-token
// substitution to every text file along the way.
//
// At L1 only `create-issue` is shipped; the function generalises to
// future bundled skills (`bug-report`, etc.) with no code change.
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { substitute } from "../branding/substitute.js";
export async function installSkills(opts) {
    const installed = [];
    const skipped = [];
    let topEntries;
    try {
        topEntries = await readdir(opts.sourceDir, { withFileTypes: true });
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return { ok: true, installed, skipped };
        }
        return { ok: false, error: err.message };
    }
    const skillDirs = topEntries.filter((e) => e.isDirectory());
    // A failed backup stops the overwrite it was protecting.
    try {
        for (const entry of skillDirs) {
            const skillName = entry.name;
            const skillSource = join(opts.sourceDir, skillName);
            // Installed skills are namespaced by a hyphen brand prefix, since
            // copy-installed project skills cannot carry a colon namespace. The source
            // dir `create-issue` installs to `.claude/skills/<slug>-create-issue/`,
            // matching the `name: ${FRAMEWORK_SLUG}-<skill>` frontmatter so the slash
            // command resolves as `/<slug>-create-issue`.
            const prefixedName = `${opts.brand.FRAMEWORK_SLUG}-${skillName}`;
            const skillDest = join(opts.destDir, ".claude", "skills", prefixedName);
            await copyTreeWithSubstitution(skillSource, skillDest, opts.brand, opts.onExisting, installed, skipped, opts.backup);
        }
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
    return { ok: true, installed, skipped };
}
async function copyTreeWithSubstitution(sourceDir, destDir, brand, onExisting, installed, skipped, backup) {
    await mkdir(destDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = join(sourceDir, entry.name);
        const dst = join(destDir, entry.name);
        if (entry.isDirectory()) {
            await copyTreeWithSubstitution(src, dst, brand, onExisting, installed, skipped, backup);
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
        if (backup && (await differsOnDisk(dst, substituted))) {
            await backup(dst);
        }
        await writeFile(dst, substituted, "utf8");
        installed.push(dst);
    }
}
/**
 * True when `path` exists with content other than `next` — the only case a
 * backup is worth taking. Only "no such file" means nothing to back up; any
 * other read failure throws, so the overwrite stops rather than proceeding
 * unprotected.
 */
async function differsOnDisk(path, next) {
    try {
        return (await readFile(path, "utf8")) !== next;
    }
    catch (err) {
        if (err.code === "ENOENT")
            return false;
        throw err;
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
//# sourceMappingURL=install.js.map