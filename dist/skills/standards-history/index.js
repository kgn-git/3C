// #21 AC5: compose + fail-safe. Any git failure (no repo, corrupt history)
// becomes a structured error with an actionable message (NFR-REL-03 /
// NFR-USE-03) — never an unhandled throw.
import { runGit } from "./git.js";
import { standardsHistory } from "./history.js";
import { standardsAsOf } from "./as-of.js";
async function assertRepo(ws) {
    const r = await runGit(ws, ["rev-parse", "--is-inside-work-tree"]);
    if (!r.ok || r.stdout.trim() !== "true") {
        return `Not a git repository (${ws}). Standards version history is git-native — run inside the standards repo.`;
    }
    return null;
}
export async function runStandardsHistory(ws, opts) {
    const bad = await assertRepo(ws);
    if (bad)
        return { ok: false, error: bad };
    try {
        return { ok: true, entries: await standardsHistory(ws, opts) };
    }
    catch (e) {
        return { ok: false, error: `standards history failed: ${e.message}` };
    }
}
export async function runStandardsAsOf(ws, date) {
    const bad = await assertRepo(ws);
    if (bad)
        return { ok: false, error: bad };
    if (Number.isNaN(Date.parse(date))) {
        return { ok: false, error: `Unparseable date "${date}" — use e.g. 2026-05-19.` };
    }
    try {
        return await standardsAsOf(ws, date);
    }
    catch (e) {
        return { ok: false, error: `standards as-of failed: ${e.message}` };
    }
}
//# sourceMappingURL=index.js.map