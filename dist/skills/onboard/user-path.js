// #378 — the one place a developer's name becomes a filesystem path. CWE-22.
//
// `--user` (or the OS account name) was joined straight into
// `.3c/onboarding/<user>.yaml` by three call sites, so `--user ../../../x` wrote
// above the workspace — reproduced by the #399 review board. Every onboarding
// path is now built here, in two independent layers:
//
//   1. an ALLOW-LIST on the name (deny-by-default, CWE-20): a bare file stem,
//      nothing that is a separator, a dot-name, a flag, or a Windows device;
//   2. a resolve-then-relative CONTAINMENT check on the result (the
//      path-and-upload rule: canonicalise first, then confirm the base contains
//      it — never a substring filter before resolution).
//
// Layer 2 is redundant while layer 1 holds, deliberately: a later widening of
// the allow-list must not be the only thing between a name and a write outside
// the tree.
//
// Links are the other escape (AC5). `mkdir({recursive:true})` and `writeFile`
// both follow a symlinked `.3c`, `onboarding` or `completions` directory, so the
// directory chain is `lstat`ed before use. The FILE is written via a fresh temp
// file renamed into place: `rename` replaces a link at the destination rather
// than writing through it, so the check-to-write window (CWE-367) is closed for
// the file itself. That defence is race-only — no deterministic test can open
// the window — and is recorded as such rather than claimed as tested.
//
// ACCEPTED RESIDUAL (#378 board): the window stays open on the DIRECTORY chain,
// for writes and for reads. Node has no `openat`/`O_NOFOLLOW` directory-handle
// API to close it, and exploiting it needs a concurrent process that can
// already write the developer's workspace — which can edit CLAUDE.md, hooks and
// source directly. A link COMMITTED to a cloned repository, the realistic
// threat, is static and is caught.
//
// Names are matched by the filesystem's own rules: on a case-insensitive volume
// (NTFS, APFS) `Ada` and `ada` are one record. That stays inside the tree and is
// not a boundary; it is stated so nobody mistakes it for one. Likewise
// `normaliseDefaultUser` can map two OS names onto one stem (`Zoë`, `Zoé`).
//
// The link checks and the rename-write are not onboarding-specific. #440 (the
// arch-exceptions waiver store) needs the same primitive; extract it to the
// platform tier there, with a second consumer to shape the API.
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
/** Letters, digits, `.`, `_`, `-`; must start with a letter, digit or `_`. */
const SAFE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/;
/** Windows device names, which name a device rather than a file in any directory. */
const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
/** The name used when the OS account name normalises to nothing usable. */
export const FALLBACK_USER = "developer";
/** Is `name` usable verbatim as an onboarding file stem? */
export function isSafeUser(name) {
    // A trailing dot is stripped by Windows, so `x.` and `x` would be one file.
    return SAFE.test(name) && !name.endsWith(".") && !DEVICE.test(name);
}
/**
 * The OS account name made safe — for the DEFAULT only (AC4).
 *
 * A developer who never typed a name must not be refused for the one their
 * machine gave them (`DOMAIN\jsmith`, `j smith`). An explicit `--user` is NOT
 * passed through here: normalising a typed name would silently map two people
 * onto one file, so it is validated and refused instead.
 */
export function normaliseDefaultUser(raw) {
    let s = raw.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[.-]+/, "").replace(/\.+$/, "");
    s = s.slice(0, 64).replace(/\.+$/, "");
    // PREFIXED, not suffixed: the device rule matches any extension, so `con.txt_`
    // would still be a device and fall through to the fallback name.
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
 * Layer 2 on its own: `dir/name` resolved, then confirmed to be a direct child
 * of `dir`. Exported so it is tested directly — through `onboardingFile` the
 * allow-list makes it unreachable, which is the point of a second layer and
 * also why a test through the public API cannot prove it works.
 */
export function containedFile(dir, name) {
    const base = resolve(dir);
    const target = resolve(base, name);
    const rel = relative(base, target);
    // `dirname(target) === base` is what "direct child" means, on every platform.
    // `rel !== name` alone was not: on POSIX `relative()` returns `a/x.yaml`
    // verbatim, so a nested path compared equal and passed — the Linux gate
    // caught what Windows (`a\x.yaml`) hid.
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel) || rel !== name || dirname(target) !== base) {
        throw new OnboardPathError("invalid-user");
    }
    return target;
}
/** A progress record is a few hundred bytes; anything this size is not one. */
export const MAX_RECORD_BYTES = 64 * 1024;
/**
 * Read `user`'s record, or `null` when there is nothing safe to read: an unsafe
 * name, a link anywhere on the path, a target that is not a regular file (a
 * FIFO would block forever), a hard-linked file, or one over the size cap.
 * Never throws — the reader's contract is "corrupt or missing → fresh".
 */
export async function readOnboardingFile(ws, user) {
    try {
        if (!isSafeUser(user) || (await anyLinked(ws, user)))
            return null;
        const target = onboardingFile(ws, user);
        const st = await lstat(target);
        // `nlink > 1`: a hard link shares its content with a path outside the tree.
        // Records this module writes always have one link (temp file + rename).
        if (!st.isFile() || st.nlink > 1 || st.size > MAX_RECORD_BYTES)
            return null;
        return await readFile(target, "utf8");
    }
    catch {
        return null;
    }
}
/** True when `p` exists and is a symbolic link or junction. Absence is not a link. */
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
/** Does any directory on the chain, or the file itself, resolve through a link? */
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
    // Each level is checked BEFORE it is created or entered: `mkdir -p` follows
    // a linked parent, so checking after it would be checking too late.
    for (const d of chain(ws, sub)) {
        if (await isLink(d))
            throw new OnboardPathError("linked-path");
        await mkdir(d, { recursive: true });
        if (await isLink(d))
            throw new OnboardPathError("linked-path");
    }
    if (await isLink(target))
        throw new OnboardPathError("linked-path");
    // CSPRNG-named temp file, created exclusively (`wx` fails on any existing
    // entry, a planted link included), then renamed over the destination.
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