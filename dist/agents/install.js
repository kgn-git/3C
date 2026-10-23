// Copies bundled agent artefacts (templates/agents/<name>.md) into the
// user's `.claude/agents/<name>.md` directory, applying brand-token
// substitution to every file along the way.
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { substitute } from "../branding/substitute.js";
export async function installAgents(opts) {
    const targetDir = join(opts.destDir, ".claude", "agents");
    await mkdir(targetDir, { recursive: true });
    let files;
    try {
        files = (await readdir(opts.sourceDir)).filter((f) => f.endsWith(".md"));
    }
    catch (err) {
        return {
            ok: false,
            error: `source dir not readable: ${opts.sourceDir} (${err.message})`,
        };
    }
    const installed = [];
    const skipped = [];
    for (const file of files) {
        // Install under a brand-slug-prefixed filename (e.g. 3c-architect.md),
        // matching the skill dir-prefix convention. Dispatch keys on the
        // `name:` frontmatter, not the filename, so this is on-disk consistency only.
        const destName = `${opts.brand.BRAND_SLUG}-${file}`;
        const destPath = join(targetDir, destName);
        const exists = await fileExists(destPath);
        if (exists && opts.onExisting === "abort") {
            return {
                ok: false,
                error: `${destPath} already exists; pass --replace to overwrite`,
            };
        }
        if (exists && opts.onExisting === "replace") {
            skipped.push(destName);
        }
        const sourceContent = await readFile(join(opts.sourceDir, file), "utf-8");
        const substituted = substitute(sourceContent, opts.brand);
        if (exists && opts.backup) {
            try {
                if ((await readFile(destPath, "utf-8")) !== substituted)
                    await opts.backup(destPath);
            }
            catch (err) {
                return { ok: false, error: `not overwriting ${destPath}: its backup failed (${err.message})` };
            }
        }
        await writeFile(destPath, substituted, "utf-8");
        installed.push(destName);
    }
    return { ok: true, installed, skipped };
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