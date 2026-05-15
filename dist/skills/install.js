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
    for (const entry of skillDirs) {
        const skillName = entry.name;
        const skillSource = join(opts.sourceDir, skillName);
        const skillDest = join(opts.destDir, ".claude", "skills", skillName);
        await copyTreeWithSubstitution(skillSource, skillDest, opts.brand, opts.onExisting, installed, skipped);
    }
    return { ok: true, installed, skipped };
}
async function copyTreeWithSubstitution(sourceDir, destDir, brand, onExisting, installed, skipped) {
    await mkdir(destDir, { recursive: true });
    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = join(sourceDir, entry.name);
        const dst = join(destDir, entry.name);
        if (entry.isDirectory()) {
            await copyTreeWithSubstitution(src, dst, brand, onExisting, installed, skipped);
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
//# sourceMappingURL=install.js.map