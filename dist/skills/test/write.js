import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { scanSecrets } from "../../validate/secrets.js";
export async function writeTest(opts) {
    // AC9: path-traversal guard. Normalise backslashes to forward slashes so
    // `path.resolve` treats them as separators on POSIX too (Node treats `\` as
    // a literal filename character on Linux, which let inputs like "..\\foo"
    // slip past the startsWith check below).
    const normalisedTarget = opts.targetPath.replace(/\\/g, "/");
    const wsRoot = resolve(opts.workspaceDir);
    const targetAbs = resolve(wsRoot, normalisedTarget);
    if (!targetAbs.startsWith(wsRoot + sep) && targetAbs !== wsRoot) {
        return { ok: false, error: `path escapes workspace: ${opts.targetPath}` };
    }
    // The string check above cannot see a link: a folder inside the workspace
    // that is a junction or symlink to elsewhere would carry the write out.
    // The nearest folder that exists is resolved and must stay inside.
    let existing = dirname(targetAbs);
    for (;;) {
        try {
            await stat(existing);
            break;
        }
        catch {
            const up = dirname(existing);
            if (up === existing)
                break;
            existing = up;
        }
    }
    const [realWs, realDir] = await Promise.all([realpath(wsRoot), realpath(existing)]);
    if (realDir !== realWs && !realDir.startsWith(realWs + sep)) {
        return { ok: false, error: `path escapes workspace: ${opts.targetPath}` };
    }
    // No-overwrite guarantee.
    try {
        await stat(targetAbs);
        return { ok: false, error: `target file already exists: ${opts.targetPath}` };
    }
    catch {
        // ENOENT — proceed.
    }
    // AC8: scanSecrets refusal.
    const scan = scanSecrets(opts.content);
    if (scan.hits.length > 0) {
        return {
            ok: false,
            error: `refusing to write: test fixture contains a secret-shaped string. Use an obviously-fake placeholder (e.g. "PLACEHOLDER_API_KEY", "<<example-token>>") instead.`,
            secretHits: scan.hits.map((h) => ({
                line: lineOf(opts.content, h.index),
                type: h.type,
                redacted: h.redacted,
            })),
        };
    }
    await mkdir(dirname(targetAbs), { recursive: true });
    // `wx` so a file created after the check above is still not overwritten.
    try {
        await writeFile(targetAbs, opts.content, { encoding: "utf8", flag: "wx" });
    }
    catch (e) {
        if (e.code === "EEXIST")
            return { ok: false, error: `target file already exists: ${opts.targetPath}` };
        throw e;
    }
    return { ok: true, written: targetAbs };
}
// From the hit's own offset — `indexOf(match)` would find the FIRST
// occurrence, so a repeated secret would report its first line every time.
function lineOf(text, index) {
    return text.slice(0, index).split("\n").length;
}
//# sourceMappingURL=write.js.map