// The workspace's local cache directory, shared by the dashboard's handover
// cache and the security scan's advisory snapshot. Kept below both so the
// scan can write to it without loading the dashboard.
import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export const cacheDir = (ws) => join(ws, `.${resolveBrandSlugSync()}`, "cache");
/**
 * Writes `name` in the cache directory through a fresh temporary file renamed
 * into place: a rename replaces a planted link rather than writing through
 * it (CWE-59), and a cache directory, or the `.3c` directory above it, that is
 * itself a link is refused, since writes through it would land outside the
 * workspace.
 */
export async function writeCacheFile(ws, name, text) {
    const dir = cacheDir(ws);
    // Each level is checked before anything is created below it, so a linked
    // `.3c` never receives a `cache` directory.
    for (const d of [dirname(dir), dir]) {
        await mkdir(d, { recursive: true });
        if (!(await lstat(d)).isDirectory())
            throw new Error(`${d} is not a directory`);
    }
    const tmp = join(dir, `.${name}.${randomBytes(6).toString("hex")}.tmp`);
    try {
        await writeFile(tmp, text, { encoding: "utf8", flag: "wx", mode: 0o600 });
        await rename(tmp, join(dir, name));
    }
    catch (e) {
        await rm(tmp, { force: true });
        throw e;
    }
}
//# sourceMappingURL=cache-file.js.map