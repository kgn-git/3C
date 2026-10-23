// Installs the handover issue template, the form the pipeline's ship step
// files a delivery record in. An adopter's edited copy is kept unless
// `--replace` asks for the package's, and then it is backed up first.
import { randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertInside } from "./backup.js";
export const ISSUE_TEMPLATE_PATH = join(".github", "ISSUE_TEMPLATE", "handover.md");
export async function installIssueTemplate(opts) {
    const source = await readFile(join(opts.packageRoot, "templates", "github", "ISSUE_TEMPLATE", "handover.md"), "utf8");
    const target = join(opts.workspace, ISSUE_TEMPLATE_PATH);
    // Checked before anything is read or written, and again after creating the
    // directories: a committed `.github` that links elsewhere must not be
    // followed (CWE-59).
    await assertInside(opts.workspace, dirname(target));
    let current = null;
    try {
        // A link is refused rather than read or written through.
        if ((await lstat(target)).isSymbolicLink())
            throw new Error(`refusing to touch a symbolic link: ${ISSUE_TEMPLATE_PATH}`);
        current = await readFile(target, "utf8");
    }
    catch (e) {
        if (e.code !== "ENOENT")
            throw e;
    }
    if (current === source)
        return "unchanged";
    if (current !== null && opts.replace !== true)
        return "kept";
    if (current !== null) {
        if (opts.backup === undefined)
            throw new Error("refusing to replace the issue template without a backup");
        await opts.backup.preserve(target);
    }
    await mkdir(dirname(target), { recursive: true });
    await assertInside(opts.workspace, dirname(target));
    // Through a fresh file renamed into place, so a link planted at the target
    // after the check is replaced rather than written through.
    const tmp = join(dirname(target), `.handover.${randomBytes(6).toString("hex")}.tmp`);
    try {
        await writeFile(tmp, source, { encoding: "utf8", flag: "wx" });
        await rename(tmp, target);
    }
    catch (e) {
        await rm(tmp, { force: true });
        throw e;
    }
    return current === null ? "written" : "replaced";
}
//# sourceMappingURL=issue-template.js.map