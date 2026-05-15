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
        const destPath = join(targetDir, file);
        const exists = await fileExists(destPath);
        if (exists && opts.onExisting === "abort") {
            return {
                ok: false,
                error: `${destPath} already exists; pass --replace to overwrite`,
            };
        }
        if (exists && opts.onExisting === "replace") {
            skipped.push(file);
        }
        const sourceContent = await readFile(join(opts.sourceDir, file), "utf-8");
        const substituted = substitute(sourceContent, opts.brand);
        await writeFile(destPath, substituted, "utf-8");
        installed.push(file);
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