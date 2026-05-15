import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
const COMPANION_FILENAME = "CLAUDE.local.md";
const COMPANION_EXAMPLE_FILENAME = "CLAUDE.local.md.example";
const COMPANION_EXAMPLE_BODY = `# Local override (gitignored)

This file is loaded by Claude Code on top of CLAUDE.md but is **not committed**
to git. Put personal notes, scratchpad rules, or per-developer overrides here.
`;
export async function writeOutput(opts) {
    const targetPath = opts.atRoot
        ? join(opts.targetDir, "CLAUDE.md")
        : join(opts.targetDir, ".claude", "CLAUDE.md");
    const exists = await fileExists(targetPath);
    const onExisting = opts.onExisting ?? "abort";
    if (exists && onExisting === "abort") {
        return { action: "abort", path: targetPath };
    }
    await mkdir(dirname(targetPath), { recursive: true });
    let backupPath;
    let action;
    if (!exists) {
        action = "create";
    }
    else if (onExisting === "replace-with-backup") {
        // AD-16: namespace the backup filename by the deployment brand slug.
        // Caller-provided slug wins; otherwise resolve via branding/runtime.
        const slug = opts.frameworkSlug ?? resolveBrandSlugSync();
        backupPath = `${targetPath}.pre-${slug}.bak`;
        const original = await readFile(targetPath, "utf8");
        await writeFile(backupPath, original, "utf8");
        action = "merge";
    }
    else {
        action = "replace";
    }
    await writeFile(targetPath, opts.content, "utf8");
    let companionPath;
    let gitignoreUpdated;
    if (opts.companionEnabled) {
        const companionDir = opts.atRoot ? opts.targetDir : join(opts.targetDir, ".claude");
        companionPath = join(companionDir, COMPANION_EXAMPLE_FILENAME);
        if (!(await fileExists(companionPath))) {
            await writeFile(companionPath, COMPANION_EXAMPLE_BODY, "utf8");
        }
        gitignoreUpdated = await ensureGitignoreEntry(opts.targetDir, COMPANION_FILENAME);
    }
    return { action, path: targetPath, backupPath, companionPath, gitignoreUpdated };
}
async function fileExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch (err) {
        if (err.code === "ENOENT")
            return false;
        throw err;
    }
}
async function ensureGitignoreEntry(targetDir, entry) {
    const path = join(targetDir, ".gitignore");
    let existing = "";
    try {
        existing = await readFile(path, "utf8");
    }
    catch (err) {
        if (err.code !== "ENOENT")
            throw err;
    }
    // Check whether `entry` already appears as a non-comment line.
    const lines = existing.split(/\r?\n/);
    const present = lines.some((line) => line.trim() === entry);
    if (present)
        return false;
    const sep = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
    await writeFile(path, `${existing}${sep}${entry}\n`, "utf8");
    return true;
}
//# sourceMappingURL=output.js.map