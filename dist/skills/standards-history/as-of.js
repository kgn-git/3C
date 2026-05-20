// #21 AC3: reconstruct the effective standards as of a past date — read-only
// git materialisation (rev-list + ls-tree + show). NEVER mutates the working
// tree (no checkout). No DB.
import { STANDARDS_PATHS, runGit } from "./git.js";
export async function standardsAsOf(ws, date) {
    const rev = await runGit(ws, [
        "rev-list",
        "-1",
        `--before=${date} 23:59:59`,
        "HEAD",
    ]);
    if (!rev.ok) {
        return { ok: false, error: rev.error ?? "git rev-list failed" };
    }
    const commit = rev.stdout.trim();
    if (commit === "") {
        return {
            ok: false,
            error: `No standards history exists on or before ${date}.`,
        };
    }
    const tree = await runGit(ws, [
        "ls-tree",
        "-r",
        "--name-only",
        commit,
        "--",
        ...STANDARDS_PATHS,
    ]);
    if (!tree.ok) {
        return { ok: false, error: tree.error ?? "git ls-tree failed" };
    }
    const paths = tree.stdout.split(/\r?\n/).filter((p) => p !== "");
    const manifest = [];
    for (const path of paths) {
        const show = await runGit(ws, ["show", `${commit}:${path}`]);
        if (show.ok)
            manifest.push({ path, content: show.stdout });
    }
    return { ok: true, commit, manifest };
}
//# sourceMappingURL=as-of.js.map