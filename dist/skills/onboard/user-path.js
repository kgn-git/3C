// Turns a developer's name into an onboarding path (CWE-22) in two layers:
//   1. an allow-list on the name (CWE-20): a bare file stem, never a
//      separator, dot-name, flag or Windows device;
//   2. resolve-then-relative containment on the result.
// Layer 2 is redundant while layer 1 holds, deliberately: widening the
// allow-list must not be the only guard against a write outside the tree.
//
// `mkdir` and `writeFile` follow a linked directory, so the chain is `lstat`ed
// first; the file goes via a temp file renamed into place, since `rename`
// replaces a link instead of writing through it (CWE-367). That is race-only
// and not deterministically testable.
//
// Accepted residual: the window stays open on the directory chain. Node has no
// `openat`/`O_NOFOLLOW` directory API, and exploiting it needs a process that
// can already write the workspace; a link committed to a repo is caught.
//
// On a case-insensitive volume `Ada` and `ada` are one record, as are two OS
// names `normaliseDefaultUser` maps to one stem; neither leaves the tree.
import { randomBytes } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
/**
 * Thrown by the writers. The message is generic on purpose (A10 / CWE-117):
 * the caller logs it, and a refused name is exactly the value not to echo.
 */
export class OnboardPathError extends Error {
    kind;
    name = "OnboardPathError";
    constructor(kind) {
        super(kind === "invalid-user"
            ? "onboarding user name is not a safe file name"
            : "onboarding state path is a link");
        this.kind = kind;
    }
}
const SAFE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/;
/** Windows device names name a device, not a file, in any directory. */
const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
/** The name used when the OS account name normalises to nothing usable. */
export const FALLBACK_USER = "developer";
export function isSafeUser(name) {
    // A trailing dot is stripped by Windows, so `x.` and `x` would be one file.
    return SAFE.test(name) && !name.endsWith(".") && !DEVICE.test(name);
}
/**
 * The OS account name made safe, for the default only: a developer must not be
 * refused for the name their machine gave them. A typed `--user` is refused
 * instead, since normalising it could map two people onto one file.
 */
export function normaliseDefaultUser(raw) {
    let s = raw.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[.-]+/, "").replace(/\.+$/, "");
    s = s.slice(0, 64).replace(/\.+$/, "");
    // Prefixed: the device rule matches any extension, so a suffix would not help.
    if (DEVICE.test(s))
        s = `_${s.slice(0, 63)}`;
    return isSafeUser(s) ? s : FALLBACK_USER;
}
/** The onboarding directory chain, outermost first: `.3c`, `onboarding`[, `sub`]. */
function chain(ws, sub) {
    const brand = join(ws, `.${resolveBrandSlugSync()}`);
    const base = join(brand, "onboarding");
    return sub === undefined ? [brand, base] : [brand, base, join(base, sub)];
}
/**
 * The file an onboarding record for `user` lives in. Throws
 * `OnboardPathError("invalid-user")` for an unsafe name, and re-checks
 * containment after resolution.
 */
export function onboardingFile(ws, user, sub) {
    if (!isSafeUser(user))
        throw new OnboardPathError("invalid-user");
    return containedFile(chain(ws, sub).at(-1), `${user}.yaml`);
}
/**
 * Layer 2: `dir/name` must resolve to a direct child of `dir`. Exported for
 * direct tests, since the allow-list makes it unreachable via `onboardingFile`.
 */
export function containedFile(dir, name) {
    const base = resolve(dir);
    const target = resolve(base, name);
    const rel = relative(base, target);
    // `rel !== name` alone passes a nested name on POSIX, where `relative()`
    // returns `a/x.yaml` verbatim; `dirname` checks "direct child" everywhere.
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel) || rel !== name || dirname(target) !== base) {
        throw new OnboardPathError("invalid-user");
    }
    return target;
}
/** A progress record is a few hundred bytes; anything this size is not one. */
export const MAX_RECORD_BYTES = 64 * 1024;
/**
 * `user`'s record, or `null` when nothing is safe to read (a FIFO would block
 * forever). Never throws: corrupt or missing means fresh.
 */
export async function readOnboardingFile(ws, user) {
    try {
        if (!isSafeUser(user) || (await anyLinked(ws, user)))
            return null;
        const target = onboardingFile(ws, user);
        const st = await lstat(target);
        // A hard link may share content with a file outside the tree; records
        // written by `writeOnboardingFile` have one link.
        if (!st.isFile() || st.nlink > 1 || st.size > MAX_RECORD_BYTES)
            return null;
        return await readFile(target, "utf8");
    }
    catch {
        return null;
    }
}
/** A missing path is not a link. */
async function isLink(p) {
    try {
        return (await lstat(p)).isSymbolicLink();
    }
    catch (err) {
        if (err.code === "ENOENT")
            return false;
        throw err;
    }
}
export async function anyLinked(ws, user, sub) {
    for (const p of [...chain(ws, sub), onboardingFile(ws, user, sub)]) {
        if (await isLink(p))
            return true;
    }
    return false;
}
/** Is the onboarding directory itself reached through a link? (The dashboard's question.) */
export async function onboardingDirLinked(ws) {
    for (const p of chain(ws))
        if (await isLink(p))
            return true;
    return false;
}
/**
 * Write `content` as `user`'s record, refusing an unsafe name or a link
 * anywhere on the path, and never writing through a link at the file itself.
 */
export async function writeOnboardingFile(ws, user, content, sub) {
    const target = onboardingFile(ws, user, sub);
    // Checked before `mkdir`, which follows a linked parent.
    for (const d of chain(ws, sub)) {
        if (await isLink(d))
            throw new OnboardPathError("linked-path");
        await mkdir(d, { recursive: true });
        if (await isLink(d))
            throw new OnboardPathError("linked-path");
    }
    if (await isLink(target))
        throw new OnboardPathError("linked-path");
    // `wx` fails on any existing entry, a planted link included.
    const tmp = join(resolve(target, ".."), `.${user}.${randomBytes(8).toString("hex")}.tmp`);
    try {
        await writeFile(tmp, content, { encoding: "utf8", flag: "wx" });
        await rename(tmp, target);
    }
    catch (err) {
        await rm(tmp, { force: true }).catch(() => { });
        throw err;
    }
}
//# sourceMappingURL=user-path.js.map