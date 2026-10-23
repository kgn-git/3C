// The local copy of the last handover-issue fetch. The dashboard's request
// path reads only this file, so serving a page never waits on the network.
// It holds records that passed the handover validator, never raw bodies, and
// re-validates them on read: the file sits in the workspace and anything
// with write access to it could have edited it.
import { lstat, mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { HANDOVER_SCHEMA, validateHandoverObject } from "./handover.js";
const VERSION = 1;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const FAILURES = new Set(["offline", "unauthenticated", "rate-limited", "not-found", "gh-missing"]);
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const cacheDir = (ws) => join(ws, `.${resolveBrandSlugSync()}`, "cache");
export const cachePath = (ws) => join(cacheDir(ws), "handovers.json");
/**
 * Writes `name` in the cache directory through a fresh temporary file renamed
 * into place: a rename replaces a planted link rather than writing through
 * it (CWE-59), and a cache directory that is itself a link is refused.
 */
export async function writeCacheFile(ws, name, text) {
    const dir = cacheDir(ws);
    await mkdir(dir, { recursive: true });
    if (!(await lstat(dir)).isDirectory())
        throw new Error(`${dir} is not a directory`);
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
export async function writeCache(ws, cache) {
    // The directory ignores itself: `.3c/` is not gitignored by default.
    await writeCacheFile(ws, ".gitignore", "*\n");
    const { records, ...counts } = cache.scan;
    const file = {
        version: VERSION,
        repo: cache.repo,
        fetchedAt: cache.fetchedAt,
        failure: cache.failure,
        ...counts,
        records: records.map(({ handover, ...fm }) => ({ handover, fm: { schema: HANDOVER_SCHEMA, ...fm } })),
    };
    await writeCacheFile(ws, "handovers.json", JSON.stringify(file));
}
const isCount = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isDate = (v) => typeof v === "string" && v.length <= 64 && !Number.isNaN(Date.parse(v));
function toCache(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
        return null;
    const o = raw;
    if (o["version"] !== VERSION)
        return null;
    const repo = o["repo"];
    if (repo !== null && (typeof repo !== "string" || !REPO.test(repo)))
        return null;
    const fetchedAt = o["fetchedAt"];
    if (fetchedAt !== null && !isDate(fetchedAt))
        return null;
    const f = o["failure"];
    let failure = null;
    if (f !== null) {
        if (typeof f !== "object" || Array.isArray(f))
            return null;
        const { state, at } = f;
        if (typeof state !== "string" || !FAILURES.has(state) || !isDate(at))
            return null;
        failure = { state: state, at };
    }
    const { legacy, malformed, excluded, conflicts, capped } = o;
    if (![legacy, malformed, excluded, conflicts].every(isCount) || typeof capped !== "boolean")
        return null;
    const list = o["records"];
    if (!Array.isArray(list))
        return null;
    const records = [];
    for (const entry of list) {
        const { handover, fm } = (entry ?? {});
        if (typeof handover !== "number" || !Number.isInteger(handover) || handover <= 0)
            return null;
        const v = validateHandoverObject(fm, handover);
        if (v.kind !== "record")
            return null;
        records.push(v.record);
    }
    return {
        repo,
        fetchedAt,
        failure,
        scan: { records, legacy, malformed, excluded, conflicts, capped },
    };
}
export async function readCache(ws) {
    // One handle for the check and the read (CWE-367), refusing a final link
    // where the platform can.
    let fh;
    try {
        fh = await open(cachePath(ws), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    }
    catch (e) {
        return e.code === "ENOENT" ? { kind: "absent" } : { kind: "invalid" };
    }
    try {
        const st = await fh.stat();
        if (!st.isFile() || st.size > MAX_CACHE_BYTES)
            return { kind: "invalid" };
        const buf = Buffer.alloc(st.size);
        const { bytesRead } = await fh.read(buf, 0, st.size, 0);
        const cache = toCache(JSON.parse(buf.subarray(0, bytesRead).toString("utf8")));
        return cache === null ? { kind: "invalid" } : { kind: "found", cache };
    }
    catch {
        return { kind: "invalid" };
    }
    finally {
        await fh.close();
    }
}
//# sourceMappingURL=handover-cache.js.map