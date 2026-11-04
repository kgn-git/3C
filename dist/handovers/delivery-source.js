// Where the delivery view's rows come from and how old they are. Reading
// never touches the network; refreshing does, and its failure is named
// rather than shown as an empty table, so "no deliveries" and "GitHub
// unreachable" can never look the same.
import { execGh, originRepo } from "../github/gh.js";
import { readCache, writeCache } from "./handover-cache.js";
import { writeCacheFile } from "../validate/cache-file.js";
import { DEADLINE_MS, fetchHandoverIssues } from "./handover-issues.js";
import { fetchIssueFlags } from "./issue-flags.js";
export const TTL_MS = 15 * 60_000;
export const defaultSourceDeps = { gh: execGh, repo: originRepo, now: () => new Date() };
const EMPTY = { records: [], legacy: 0, malformed: 0, unreadable: [], excluded: 0, conflicts: 0, capped: false, noted: [] };
const unmeasured = { flags: null, authors: null };
function sourceOf(cache, now) {
    const { repo, scan, fetchedAt, failure, flags, authors } = cache;
    if (failure !== null && (fetchedAt === null || Date.parse(failure.at) >= Date.parse(fetchedAt))) {
        return { repo, scan, flags, authors, status: { kind: "failed", state: failure.state, at: failure.at, fetchedAt } };
    }
    if (fetchedAt === null)
        return { repo, scan, flags, authors, status: { kind: "failed", state: "never-fetched", at: null, fetchedAt } };
    // A fetch dated in the future (a clock that moved back) counts as expired.
    const age = now.getTime() - Date.parse(fetchedAt);
    const kind = age >= 0 && age < TTL_MS ? "fresh" : "expired";
    return { repo, scan, flags, authors, status: { kind, fetchedAt } };
}
/** The cached delivery data and its status; never spawns a process. */
export async function readDelivery(ws, now) {
    const read = await readCache(ws);
    if (read.kind === "found")
        return sourceOf(read.cache, now);
    if (read.kind === "invalid")
        return { repo: null, scan: EMPTY, ...unmeasured, status: { kind: "discarded" } };
    if (read.kind === "outdated")
        return { repo: null, scan: EMPTY, ...unmeasured, status: { kind: "outdated" } };
    return { repo: null, scan: EMPTY, ...unmeasured, status: { kind: "failed", state: "never-fetched", at: null, fetchedAt: null } };
}
async function extraNumbers(ws, deps) {
    // The memory is advice; a memory that cannot be read must not stop the rows from refreshing.
    try {
        return (await deps.extraIssues?.(ws)) ?? [];
    }
    catch {
        return [];
    }
}
/** Reads the handover list once, then the state of the issues it names, and records the outcome in the cache: new rows, or the failure beside the old ones. */
export async function refreshDelivery(ws, deps) {
    const now = deps.now().toISOString();
    const previous = await readCache(ws);
    const old = previous.kind === "found" ? previous.cache : null;
    const repo = await deps.repo(ws);
    // What was measured for another repository says nothing about this one.
    const keep = old !== null && old.repo === repo ? old : null;
    const kept = { fetchedAt: keep?.fetchedAt ?? null, scan: keep?.scan ?? EMPTY, flags: keep?.flags ?? null, authors: keep?.authors ?? null };
    const failed = async (failure, detail, rest) => {
        await writeCache(ws, { repo, failure: { state: failure, at: now }, ...rest });
        // The raw gh output stays on disk for whoever investigates; the view only
        // ever names the state.
        await writeCacheFile(ws, "handover-fetch.log", `${now} ${failure}\n${detail}\n`);
    };
    if (repo === null)
        return failed("not-found", "origin is not a github.com repository", kept);
    // One total for the whole refresh, so the flag read gets what the handover read left of it.
    const deadline = Date.now() + DEADLINE_MS;
    const fetched = await fetchHandoverIssues(repo, deps.gh, deadline);
    if (!fetched.ok)
        return failed(fetched.failure, fetched.detail, kept);
    const { scan, authors } = fetched;
    // The memory's numbers come first, newest handover first, so when they alone pass the cap the oldest are cut and no follow-up gets a slot.
    const wanted = [...(await extraNumbers(ws, deps)), ...scan.records.flatMap((r) => r.follow_ups)];
    const read = await fetchIssueFlags(repo, wanted, deps.gh, deadline);
    if (read.ok) {
        await writeCache(ws, { repo, fetchedAt: now, failure: null, scan, authors, flags: { at: now, cut: read.cut, list: read.flags } });
        return;
    }
    // The rows are new even when their flags could not be read; the old flags keep their own time.
    return failed(read.failure, read.detail, { fetchedAt: now, scan, authors, flags: kept.flags });
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