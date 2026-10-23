// Back up before `--replace` overwrites.
//
// `--replace` refreshes the adopter's copies of skills, agents, rules and
// CLAUDE.md from the package, and those copies are often edited. Each file it
// is about to overwrite is first copied to
// `.<slug>/backups/<UTC stamp>-<id>/<workspace-relative path>`, so an edit is
// one copy away from recovery. The directory ignores itself, like the error
// log beside it: a backup is local recovery material, not something to commit.
import { randomBytes } from "node:crypto";
import { copyFile, lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
/** Throws unless the deepest existing ancestor of `target` really lies inside `workspace`. */
export async function assertInside(workspace, target) {
    let probe = resolve(target);
    for (;;) {
        try {
            const real = relative(await realpath(workspace), await realpath(probe));
            if (real === ".." || real.startsWith(`..${sep}`) || isAbsolute(real)) {
                throw new Error(`refusing to back up into a directory outside the workspace: ${target}`);
            }
            return;
        }
        catch (err) {
            if (err.code !== "ENOENT")
                throw err;
            const up = dirname(probe);
            if (up === probe)
                throw err;
            probe = up;
        }
    }
}
/** A backup session for one replace run in `workspace`; nothing is created until a file is preserved. */
export function createBackup(workspace, slug, now = new Date()) {
    const base = join(resolve(workspace), `.${slug}`, "backups");
    // Colons are not legal in Windows paths; the random suffix keeps two runs
    // in the same second apart.
    const stamp = `${now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-")}-${randomBytes(3).toString("hex")}`;
    let dir = null;
    let saved = 0;
    const preserve = async (absPath) => {
        const rel = relative(resolve(workspace), resolve(absPath));
        if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
            throw new Error(`refusing to back up a path outside the workspace: ${absPath}`);
        }
        // A link is not backed up — copying through it would pull an outside file
        // into the workspace — and refusing here also stops the overwrite.
        if ((await lstat(absPath)).isSymbolicLink()) {
            throw new Error(`refusing to back up (and so to overwrite) a symbolic link: ${absPath}`);
        }
        // CWE-59: lexical containment is not enough if .<slug> or backups is a
        // link out of the workspace. Checked BEFORE anything is created, against
        // the deepest part of the path that already exists, and on every call.
        await assertInside(workspace, base);
        if (dir === null) {
            // 0700 is honoured on POSIX only; on Windows the directory inherits ACLs.
            await mkdir(base, { recursive: true, mode: 0o700 });
            await assertInside(workspace, base);
            await writeFile(join(base, ".gitignore"), "*\n");
            dir = join(base, stamp);
        }
        const dest = join(dir, rel);
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(absPath, dest);
        saved += 1;
    };
    return {
        preserve,
        get saved() {
            return saved;
        },
        get dir() {
            return dir;
        },
    };
}
//# sourceMappingURL=backup.js.map