import { writeCacheFile } from "../validate/cache-file.js";
import { hasControl } from "../handovers/controls.js";
import { fetchHandoverBodies } from "../handovers/handover-bodies.js";
import { newestFirst } from "../handovers/handover-issues.js";
import { parseHandoverBody } from "../handovers/handover.js";
import { splitNotes } from "./notes.js";
import { secretTypesIn } from "./screen.js";
import { STORE_LIMITS, writeStore } from "./store.js";
export const RETRY_VERB = "3c memory sync";
// A secret screen costs time with the characters it scans, and the internal-hostname detector in scanSecrets is
// quadratic in a long run of hyphenated letters (measured at 136 microseconds for 600 characters, against 5 for
// ordinary text; the other detectors were not measured). The characters one sync will screen, a note's own text
// and every run of its wrapped lines, are capped, and a note past the cap is refused and counted.
export const RUN_CHAR_BUDGET = 20_000_000;
// GitHub's list can trail a create, so a sync run for a handover that was just filed reads again, once, when the
// list does not show it.
export const RETRY_WAIT_MS = 3_000;
export async function syncMemory(ws, deps, limits = STORE_LIMITS, runBudget = RUN_CHAR_BUDGET, expecting) {
    const syncedAt = deps.now().toISOString();
    const repo = await deps.repo(ws);
    if (repo === null)
        return { ok: false, reason: "fetch", failure: "not-found" };
    let fetched = await fetchHandoverBodies(repo, deps.gh);
    let unlisted;
    if (expecting !== undefined && fetched.ok && !fetched.listed.includes(expecting.number)) {
        await expecting.wait(RETRY_WAIT_MS);
        fetched = await fetchHandoverBodies(repo, deps.gh);
        if (fetched.ok && !fetched.listed.includes(expecting.number))
            unlisted = expecting.number;
    }
    if (!fetched.ok) {
        // The dashboard's failureRoute names this file, so a sync writes the same log.
        await writeCacheFile(ws, "handover-fetch.log", `${syncedAt} ${fetched.failure}\n${fetched.detail}\n`).catch(() => undefined);
        return { ok: false, reason: "fetch", failure: fetched.failure };
    }
    const notes = [];
    const secretTypes = new Set();
    const refused = { secret: 0, control: 0, long: 0, wrapped: 0, fenced: 0, unclosed: 0 };
    const readable = [];
    let unreadable = 0;
    for (const { number, body } of fetched.bodies) {
        const parsed = parseHandoverBody(number, body);
        if (parsed.kind === "record")
            readable.push({ record: parsed.record, body });
        else
            unreadable++;
    }
    // A delivery is its pull request, or its handover number when none is named; the newest handover for it
    // wins, ordered as the dashboard orders them, so a handover filed again does not repeat every note.
    readable.sort((a, b) => newestFirst(a.record, b.record));
    const delivered = new Set();
    let handovers = 0;
    let superseded = 0;
    let overBudget = 0;
    for (const { record, body } of readable) {
        const key = record.pr === undefined ? `handover:${record.handover}` : `pr:${record.pr}`;
        if (delivered.has(key)) {
            superseded++;
            continue;
        }
        delivered.add(key);
        handovers++;
        const split = splitNotes(record.handover, record.issues, body);
        refused.long += split.refused.long;
        refused.wrapped += split.refused.wrapped;
        refused.control += split.refused.control;
        refused.fenced += split.refused.fenced;
        refused.unclosed += split.refused.unclosed;
        for (const [i, note] of split.notes.entries()) {
            const runs = split.wrapped[i] ?? [];
            const cost = note.text.length + runs.reduce((sum, run) => sum + run.length, 0);
            if (cost > runBudget) {
                overBudget++;
                continue;
            }
            runBudget -= cost;
            const found = secretTypesIn(note.text, ...runs);
            if (found.length > 0) {
                refused.secret++;
                for (const type of found)
                    secretTypes.add(type);
            }
            else if (hasControl(note.text))
                refused.control++;
            else
                notes.push(note);
        }
    }
    const written = await writeStore(ws, { meta: { repo, syncedAt }, notes }, limits);
    if (!written.ok)
        return { ok: false, reason: "cap", cap: written.cap, count: written.count, limit: written.limit };
    return {
        ok: true,
        summary: {
            repo,
            handovers,
            notes: notes.length,
            unreadable,
            superseded,
            excluded: fetched.excluded,
            capped: fetched.capped,
            overBudget,
            refused: { ...refused, secretTypes: [...secretTypes].sort() },
            syncedAt,
            ...(unlisted === undefined ? {} : { unlisted }),
        },
    };
}
//# sourceMappingURL=sync.js.map