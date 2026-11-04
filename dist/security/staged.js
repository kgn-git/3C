// What a commit adds, read from the index. The scan reads the working copy, which can differ from what is staged: a
// credential staged and then edited out on disk is clean in the folder and still in the commit. One bounded
// `git diff --cached` gives every staged addition with its line number in the new file, with no process per file.
// The file set runs its own `git diff --cached` for the names; that second process is an accepted cost.
import { createHash } from "node:crypto";
/** Larger than this and the patch is not read whole; the gate then blocks instead of scanning part of it. */
export const MAX_STAGED_PATCH_BYTES = 8 * 1024 * 1024;
/** The name in a `+++` header: git ends it with a tab when the name holds a space, and the patch may use CRLF. */
const headerName = (target) => target.replace(/\r$/, "").replace(/\t.*$/, "");
/**
 * The added lines of each file in a unified patch with no context (`-U0`) whose prefixes are `a/` and `b/`. A file
 * that was deleted, or whose content did not change, adds nothing.
 */
export function parseStagedAdditions(patch) {
    const out = [];
    let file = null;
    let lines = [];
    let next = 0;
    let inHunk = false;
    const close = () => {
        if (file !== null && lines.length > 0)
            out.push({ file, lines });
        file = null;
        lines = [];
        inHunk = false;
    };
    for (const line of patch.split("\n")) {
        if (line.startsWith("diff --git ")) {
            close();
            continue;
        }
        // A line that starts with `+++` is a header only before the first hunk: inside one it is added content.
        if (!inHunk && line.startsWith("+++ ")) {
            const target = headerName(line.slice(4));
            file = target === "/dev/null" ? null : target.replace(/^b\//, "");
            continue;
        }
        const hunk = /^@@ -\S+ \+(\d+)(?:,\d+)? @@/.exec(line);
        if (hunk !== null) {
            next = Number(hunk[1]);
            inHunk = true;
            continue;
        }
        if (inHunk && file !== null && line.startsWith("+"))
            lines.push({ no: next++, text: line.slice(1) });
    }
    close();
    return out;
}
/** The staged additions of the repository at `workspaceDir`. A git failure throws: nothing is assumed clean. */
export async function readStagedAdditions(workspaceDir, runner) {
    const patch = await runner([
        "-C",
        workspaceDir,
        "-c",
        "core.quotePath=false",
        "diff",
        "--cached",
        "--no-color",
        "--no-renames",
        // The header format must not depend on the reader's config (`diff.mnemonicPrefix`, `diff.noprefix`).
        "--src-prefix=a/",
        "--dst-prefix=b/",
        // A file marked binary in .gitattributes, a text conversion or an external diff driver would otherwise change
        // or hide what the patch shows of the same staged content.
        "--text",
        "--no-textconv",
        "--no-ext-diff",
        "--diff-filter=d",
        "-U0",
    ]);
    if (Buffer.byteLength(patch, "utf8") > MAX_STAGED_PATCH_BYTES) {
        return { additions: [], oversize: true, digest: createHash("sha256").update(patch).digest("hex").slice(0, 16) };
    }
    return { additions: parseStagedAdditions(patch), oversize: false, digest: null };
}
//# sourceMappingURL=staged.js.map