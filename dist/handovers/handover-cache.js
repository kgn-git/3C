// The local copy of the last handover-issue fetch. The dashboard's request
// path reads only this file, so serving a page never waits on the network.
// It holds records that passed the handover validator, never raw bodies, and
// re-validates them on read: the file sits in the workspace and anything
// with write access to it could have edited it.
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { cacheDir, writeCacheFile } from "../validate/cache-file.js";
import { isCount } from "./counts.js";
import { HANDOVER_SCHEMA, validateHandoverObject } from "./handover.js";
import { ISSUE_CAP, countUnreadable } from "./handover-unreadable.js";
const CACHE_VERSION = 3;
const MAX_REASON = 200;
// Trusted non-deliveries and number-less items are each capped at ISSUE_CAP.
const MAX_UNREADABLE = 2 * ISSUE_CAP;
// A reason reaches the terminal, so besides C0 and C1 controls this refuses
// the line separators and the bidirectional overrides that can reorder a line.
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const FAILURES = new Set(["offline", "unauthenticated", "rate-limited", "not-found", "gh-missing"]);
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const cachePath = (ws) => join(cacheDir(ws), "handovers.json");
export async function writeCache(ws, cache) {
    // The directory ignores itself: `.3c/` is not gitignored by default.
    await writeCacheFile(ws, ".gitignore", "*\n");
    // The counts are derived from the list on read, so only the list is stored.
    const { records, legacy: _legacy, malformed: _malformed, ...counts } = cache.scan;
    const file = {
        version: CACHE_VERSION,
        repo: cache.repo,
        fetchedAt: cache.fetchedAt,
        failure: cache.failure,
        ...counts,
        records: records.map(({ handover, ...fm }) => ({ handover, fm: { schema: HANDOVER_SCHEMA, ...fm } })),
    };
    await writeCacheFile(ws, "handovers.json", JSON.stringify(file));
}
const isDate = (v) => typeof v === "string" && v.length <= 64 && !Number.isNaN(Date.parse(v));
function toUnreadable(raw) {
    if (!Array.isArray(raw) || raw.length > MAX_UNREADABLE)
        return null;
    const out = [];
    for (const entry of raw) {
        const { issue, kind, reason } = (entry ?? {});
        if (issue !== null && (typeof issue !== "number" || !Number.isSafeInteger(issue) || issue <= 0))
            return null;
        if (kind !== "legacy" && kind !== "malformed")
            return null;
        if (typeof reason !== "string" || reason.length > MAX_REASON || CONTROL.test(reason))
            return null;
        out.push({ issue, kind, reason });
    }
    return out;
}
function toCache(raw) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
        return null;
    const o = raw;
    if (o["version"] !== CACHE_VERSION)
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
    const { excluded, conflicts, capped } = o;
    if (![excluded, conflicts].every(isCount) || typeof capped !== "boolean")
        return null;
    const unreadable = toUnreadable(o["unreadable"]);
    if (unreadable === null)
        return null;
    const list = o["records"];
    if (!Array.isArray(list) || list.length > ISSUE_CAP)
        return null;
    const records = [];
    for (const entry of list) {
        const { handover, fm } = (entry ?? {});
        if (typeof handover !== "number" || !Number.isSafeInteger(handover) || handover <= 0)
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
        scan: { records, ...countUnreadable(unreadable), unreadable, excluded, conflicts, capped },
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
        const raw = JSON.parse(buf.subarray(0, bytesRead).toString("utf8"));
        const version = raw?.version;
        if (typeof version === "number" && Number.isInteger(version) && version >= 1 && version < CACHE_VERSION)
            return { kind: "outdated" };
        const cache = toCache(raw);
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