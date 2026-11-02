// The workspace's local state directories, shared by the dashboard's handover
// cache, the security scan's advisory snapshot and the delivery memory. Kept
// below all of them so none has to load another to write.
import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export const cacheDir = (ws) => join(ws, `.${resolveBrandSlugSync()}`, "cache");
// Windows refuses a rename onto a file that another rename holds for a moment, so two writers racing
// for one name would otherwise fail one of them with a permission error.
const RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
const RETRIES = 8;
async function renameWithRetry(from, to) {
    for (let attempt = 0;; attempt++) {
        try {
            await rename(from, to);
            return;
        }
        catch (e) {
            const code = e.code;
            if (attempt >= RETRIES || typeof code !== "string" || !RETRY_CODES.has(code))
                throw e;
            await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)));
        }
    }
}
/**
 * Writes `name` in `dir` (a state directory directly under `.3c`) through a
 * fresh temporary file renamed into place: a rename replaces a planted link
 * rather than writing through it (CWE-59), and a directory, or the `.3c`
 * directory above it, that is itself a link is refused, since writes through
 * it would land outside the workspace.
 */
export async function writeStateFile(dir, name, text) {
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
        await renameWithRetry(tmp, join(dir, name));
    }
    catch (e) {
        await rm(tmp, { force: true });
        throw e;
    }
}
export const writeCacheFile = (ws, name, text) => writeStateFile(cacheDir(ws), name, text);
//# sourceMappingURL=cache-file.js.map