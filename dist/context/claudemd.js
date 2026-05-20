import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
async function readIf(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch {
        return null;
    }
}
export async function loadScopedClaudeMd(workspaceDir, filePath) {
    const ws = resolve(workspaceDir);
    const rootPath = join(ws, "CLAUDE.md");
    const root = (await readIf(rootPath)) ?? "";
    // Walk up from the file's directory to (but not including) ws, taking the
    // nearest CLAUDE.md that is not the root one.
    let dir = null;
    let cur = resolve(dirname(filePath));
    while (cur.startsWith(ws) && cur !== ws) {
        const candidate = join(cur, "CLAUDE.md");
        if (candidate !== rootPath) {
            const txt = await readIf(candidate);
            if (txt !== null) {
                dir = txt;
                break;
            }
        }
        const parent = dirname(cur);
        if (parent === cur)
            break;
        cur = parent;
    }
    const merged = dir === null ? root : `${root}\n${dir}`;
    return { root, dir, merged };
}
//# sourceMappingURL=claudemd.js.map