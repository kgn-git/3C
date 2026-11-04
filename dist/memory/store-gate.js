// Whether the memory folder may be read as the work of `3c memory sync`, and the words every command uses to refuse
// it. The brief, the prompt, the lessons command and the developer view all decide on this one module, so one cause is refused for one reason.
import { readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { tracksAnything } from "./git-probe.js";
import { memoryDir, readStore } from "./store.js";
import { RETRY_VERB as SYNC } from "./sync.js";
/** Why the memory folder cannot be taken as written by 3c memory sync, or null when it can. A tracked folder may have come from a commit. */
async function untrustedStore(ws, folder, run) {
    const dir = memoryDir(ws);
    const tracked = await tracksAnything(run, folder);
    if (tracked === null) {
        return {
            why: "version control could not say whether the memory folder is kept in it",
            next: "check that git is installed and that this folder is in a git repository, then run the brief again.",
        };
    }
    if (tracked) {
        return {
            why: `the memory folder is kept in version control, so it may have come from a commit and not from ${SYNC}`,
            // Deleting the folder would leave git listing it, so the brief would refuse again.
            next: `stop version control keeping the folder with \`git rm -r --cached ${folder}\`, then run ${SYNC}.`,
        };
    }
    const next = `run ${SYNC}, which writes the ignore file again.`;
    let ignore;
    try {
        ignore = await readFile(join(dir, ".gitignore"), "utf8");
    }
    catch {
        return { why: "the memory folder has no ignore file of its own", next };
    }
    return ignore.trim() === "*" ? null : { why: `the memory folder's ignore file is not the one ${SYNC} writes`, next };
}
/** A link is removed itself and never followed, so what it points to is left alone; a wrong kind of entry has to go before the sync can write; anything else the sync rebuilds. */
function refusedStoreNext(reason, folder) {
    if (/ is a link$/.test(reason))
        return `remove the link named above, not the folder it points to, then run ${SYNC}.`;
    if (/ is not a readable (directory|file)$/.test(reason))
        return `delete the ${folder} entry, then run ${SYNC} to build it again.`;
    return `run ${SYNC}, which builds the memory again from the handovers and leaves out what it cannot use. If the brief refuses again, delete the ${folder} folder, then run ${SYNC}.`;
}
/** The store a command may read: one just read that is not refused and was written by the sync, or the refusal with its next step. */
async function usableStore(read, ws, run) {
    const folder = relative(ws, memoryDir(ws)).split(sep).join("/");
    if (read.kind === "refused")
        return { ok: false, refusal: { why: read.reason, next: refusedStoreNext(read.reason, folder) } };
    const refusal = await untrustedStore(ws, folder, run);
    return refusal === null ? { ok: true, store: read.store } : { ok: false, refusal };
}
/** The two lines a command prints when the memory was refused; `who` is the command's own name, such as "Memory brief". */
export const refusalLines = (who, refusal) => [
    `${who}: the memory was not used, because ${refusal.why}.`,
    `Next step: ${refusal.next}`,
];
export async function readUsableStore(ws, run, limits) {
    const read = await readStore(ws, limits);
    if (read.kind === "absent")
        return { kind: "absent" };
    const used = await usableStore(read, ws, run);
    return used.ok ? { kind: "usable", store: used.store } : { kind: "refused", refusal: used.refusal };
}
//# sourceMappingURL=store-gate.js.map