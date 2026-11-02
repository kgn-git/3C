// Where the delivery view's rows come from and how old they are. Reading
// never touches the network; refreshing does, and its failure is named
// rather than shown as an empty table, so "no deliveries" and "GitHub
// unreachable" can never look the same.
import { execGh, originRepo } from "../github/gh.js";
import { readCache, writeCache } from "./handover-cache.js";
import { writeCacheFile } from "../validate/cache-file.js";
import { fetchHandoverIssues } from "./handover-issues.js";
export const TTL_MS = 15 * 60_000;
export const defaultSourceDeps = { gh: execGh, repo: originRepo, now: () => new Date() };
const EMPTY = { records: [], legacy: 0, malformed: 0, unreadable: [], excluded: 0, conflicts: 0, capped: false };
function sourceOf(cache, now) {
    const { repo, scan, fetchedAt, failure } = cache;
    if (failure !== null && (fetchedAt === null || Date.parse(failure.at) >= Date.parse(fetchedAt))) {
        return { repo, scan, status: { kind: "failed", state: failure.state, at: failure.at, fetchedAt } };
    }
    if (fetchedAt === null)
        return { repo, scan, status: { kind: "failed", state: "never-fetched", at: null, fetchedAt } };
    // A fetch dated in the future (a clock that moved back) counts as expired.
    const age = now.getTime() - Date.parse(fetchedAt);
    const kind = age >= 0 && age < TTL_MS ? "fresh" : "expired";
    return { repo, scan, status: { kind, fetchedAt } };
}
/** The cached delivery data and its status; never spawns a process. */
export async function readDelivery(ws, now) {
    const read = await readCache(ws);
    if (read.kind === "found")
        return sourceOf(read.cache, now);
    if (read.kind === "invalid")
        return { repo: null, scan: EMPTY, status: { kind: "discarded" } };
    if (read.kind === "outdated")
        return { repo: null, scan: EMPTY, status: { kind: "outdated" } };
    return { repo: null, scan: EMPTY, status: { kind: "failed", state: "never-fetched", at: null, fetchedAt: null } };
}
/** Fetches once and records the outcome in the cache: new rows, or the failure beside the old ones. */
export async function refreshDelivery(ws, deps) {
    const now = deps.now().toISOString();
    const previous = await readCache(ws);
    const old = previous.kind === "found" ? previous.cache : null;
    const repo = await deps.repo(ws);
    const result = repo === null
        ? { ok: false, failure: "not-found", detail: "origin is not a github.com repository" }
        : await fetchHandoverIssues(repo, deps.gh);
    if (result.ok) {
        await writeCache(ws, { repo, fetchedAt: now, failure: null, scan: result.scan });
        return;
    }
    const keep = old !== null && old.repo === repo;
    await writeCache(ws, {
        repo,
        fetchedAt: keep ? old.fetchedAt : null,
        failure: { state: result.failure, at: now },
        scan: keep ? old.scan : EMPTY,
    });
    // The raw gh output stays on disk for whoever investigates; the view only
    // ever names the state.
    await writeCacheFile(ws, "handover-fetch.log", `${now} ${result.failure}\n${result.detail}\n`);
}
export const needsRefresh = (s) => s.status.kind !== "fresh";
/** For one-shot commands: refresh when the cache is missing, invalid or stale, then read it. */
export async function loadDelivery(ws, deps) {
    const current = await readDelivery(ws, deps.now());
    if (!needsRefresh(current))
        return current;
    await refreshDelivery(ws, deps);
    return readDelivery(ws, deps.now());
}
//# sourceMappingURL=delivery-source.js.map