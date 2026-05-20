// #21 AC1/AC2/AC4: chronological timeline of standards changes from git
// metadata, scoped to STANDARDS_PATHS. PR link parsed from the merge subject;
// absent → omitted (graceful, AC4). No DB — git log is the engine (AD-01).
import { posix } from "node:path";
import { STANDARDS_PATHS, runGit } from "./git.js";
const US = "\x1f"; // unit separator between fields
const RS = "\x1e"; // record separator between commits
function prOf(message) {
    const m = /Merge pull request #(\d+)/.exec(message) ??
        /\(#(\d+)\)\s*$/.exec(message.split("\n")[0] ?? "");
    return m ? `#${m[1]}` : undefined;
}
export async function standardsHistory(ws, opts) {
    const pathspec = opts.rule
        ? [posix.join(".claude/rules", opts.rule)]
        : [...STANDARDS_PATHS];
    const r = await runGit(ws, [
        "log",
        "--date=iso-strict",
        `--pretty=format:%H${US}%an${US}%ad${US}%B${RS}`,
        "--",
        ...pathspec,
    ]);
    if (!r.ok)
        return [];
    const out = [];
    for (const rec of r.stdout.split(RS)) {
        const t = rec.trim();
        if (t === "")
            continue;
        const [commit, author, date, ...rest] = t.split(US);
        const message = (rest.join(US) ?? "").trim();
        if (!commit || !author || !date)
            continue;
        const pr = prOf(message);
        out.push(pr ? { commit, author, date, message, pr } : { commit, author, date, message });
    }
    return out;
}
//# sourceMappingURL=history.js.map