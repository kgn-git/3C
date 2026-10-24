// The offline advisory source for the dependency half of the scan. `security
// refresh` turns an `npm audit --json` report into a dated snapshot; the scan
// reads only the snapshot and the lockfile, so it never touches the network
// (NFR-SEC-01). Both sit in the workspace and anything with write access could
// have edited them, so both are re-validated on every read.
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join } from "node:path";
import { cacheDir, writeCacheFile } from "../validate/cache-file.js";
export const STALE_AFTER_DAYS = 7;
const FILE = "advisories.json";
export const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
export const MAX_ENTRIES = 20_000;
const DAY_MS = 86_400_000;
// A clock a little ahead of the machine that wrote the snapshot is tolerated;
// a date further ahead would keep a snapshot from ever reading as stale.
const MAX_FUTURE_MS = DAY_MS;
// npm's rule for names it still installs, which keeps upper case for older
// packages such as JSONStream: optionally scoped, at most 214 characters, no
// leading dot or underscore (so never `__proto__`).
const NPM_NAME = /^(?:@[A-Za-z0-9~-][A-Za-z0-9._~-]*\/)?[A-Za-z0-9~-][A-Za-z0-9._~-]*$/;
const ADVISORY_ID = /^(?:GHSA(?:-[0-9a-z]{4}){3}|npm-\d{1,10}|via (?:@[A-Za-z0-9~-][A-Za-z0-9._~-]*\/)?[A-Za-z0-9~-][A-Za-z0-9._~-]*)$/;
export const SEMVER = /^\d{1,6}\.\d{1,6}\.\d{1,9}(?:-[0-9A-Za-z.-]{1,64})?(?:\+[0-9A-Za-z.-]{1,64})?$/;
const SEVERITY = {
    critical: "critical",
    high: "high",
    moderate: "medium",
    low: "low",
    info: null,
};
const SEVERITIES = new Set(["critical", "high", "medium", "low"]);
export const isPackageName = (s) => typeof s === "string" && s.length <= 214 && NPM_NAME.test(s);
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
// Only npm's error code decides the wording; neither the code nor npm's
// summary is repeated, since the summary can carry a registry URL with
// credentials in it.
const NETWORK_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH"]);
const RETRY = "run `npm audit` yourself to see why";
function refusal(error) {
    const code = isRecord(error) && typeof error["code"] === "string" ? error["code"] : "";
    if (code === "ENOLOCK")
        return "npm audit needs a package-lock.json, so run `npm install` first";
    if (NETWORK_CODES.has(code))
        return "npm audit could not reach the npm registry, so check your network connection";
    return `npm audit stopped with an error, so ${RETRY}`;
}
/** The advisory id one `via` list names: a GHSA id when npm gives one. */
function advisoryId(via) {
    if (!Array.isArray(via))
        return null;
    for (const v of via) {
        if (!isRecord(v))
            continue;
        const ghsa = typeof v["url"] === "string" ? /\/advisories\/(GHSA(?:-[0-9a-z]{4}){3})$/.exec(v["url"]) : null;
        if (ghsa)
            return ghsa[1];
        if (typeof v["source"] === "number" && Number.isInteger(v["source"]) && v["source"] >= 0)
            return `npm-${v["source"]}`;
    }
    const through = via.find(isPackageName);
    return through === undefined ? null : `via ${through}`;
}
/**
 * Reads `npm audit --json` (report version 2). The whole report is refused when
 * any entry is malformed: a partial map would pass a vulnerable package the
 * report named.
 */
export function parseNpmAudit(stdout) {
    const unreadable = { kind: "refused", reason: `npm audit did not return a report this version can read, so ${RETRY}` };
    let raw;
    try {
        raw = JSON.parse(stdout);
    }
    catch {
        return unreadable;
    }
    if (!isRecord(raw))
        return unreadable;
    if ("error" in raw)
        return { kind: "refused", reason: refusal(raw["error"]) };
    const vulns = raw["vulnerabilities"];
    if (raw["auditReportVersion"] !== 2 || !isRecord(vulns)) {
        return { kind: "refused", reason: "npm audit's report is in an older format, so update npm to version 7 or later" };
    }
    const entries = Object.entries(vulns);
    if (entries.length > MAX_ENTRIES)
        return unreadable;
    const advisories = {};
    for (const [name, v] of entries) {
        const level = isRecord(v) && typeof v["severity"] === "string" && Object.hasOwn(SEVERITY, v["severity"]) ? SEVERITY[v["severity"]] : undefined;
        const id = isRecord(v) ? advisoryId(v["via"]) : null;
        if (!isPackageName(name) || level === undefined || (level !== null && id === null))
            return unreadable;
        if (level !== null)
            advisories[name] = { severity: level, id: id };
    }
    return { kind: "parsed", advisories };
}
/**
 * Reads a workspace file through one handle within the cap (CWE-367). A link
 * is refused: by lstat on every platform, and by O_NOFOLLOW at the open where
 * the platform has it, so a link swapped in between is refused too (CWE-59).
 */
export async function readWorkspaceFile(path, max = MAX_SNAPSHOT_BYTES) {
    try {
        if ((await lstat(path)).isSymbolicLink())
            return { kind: "unreadable" };
    }
    catch (e) {
        return e.code === "ENOENT" ? { kind: "absent" } : { kind: "unreadable" };
    }
    let fh;
    try {
        fh = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    }
    catch (e) {
        return e.code === "ENOENT" ? { kind: "absent" } : { kind: "unreadable" };
    }
    try {
        const st = await fh.stat();
        if (!st.isFile())
            return { kind: "unreadable" };
        if (st.size > max)
            return { kind: "too-large" };
        const buf = Buffer.alloc(st.size);
        const { bytesRead } = await fh.read(buf, 0, st.size, 0);
        return { kind: "read", text: buf.subarray(0, bytesRead).toString("utf8") };
    }
    catch {
        return { kind: "unreadable" };
    }
    finally {
        await fh.close();
    }
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * npm audit reports on packages it fetched from a registry. Only an entry with
 * an integrity hash whose `resolved` URL has a registry's tarball layout for
 * this name and version (`…/<name>/-/<file>-<version>.tgz`) counts. A git,
 * file or other source, a tarball elsewhere, or a missing `resolved` does
 * not. The registry's host is not compared: the scan does not read npm's
 * configuration, so a lockfile edited to imitate the layout on another host
 * is outside what this check can see.
 */
function fromRegistry(name, entry) {
    const { resolved, version, integrity } = entry;
    if (typeof resolved !== "string" || typeof version !== "string" || typeof integrity !== "string" || integrity === "")
        return false;
    let url;
    let path;
    try {
        url = new URL(resolved);
        path = decodeURIComponent(url.pathname);
    }
    catch {
        return false;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:")
        return false;
    const base = name.slice(name.lastIndexOf("/") + 1);
    return new RegExp(`/${escapeRe(name)}/-/${escapeRe(base)}-${escapeRe(version)}\\.tgz$`).test(path);
}
/** The version of each top-level registry package a lockfile text holds, or null when it is not a lockfile. */
export function lockVersions(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return null;
    }
    const packages = isRecord(raw) ? raw["packages"] : undefined;
    if (!isRecord(packages))
        return null;
    const out = {};
    let n = 0;
    for (const [key, entry] of Object.entries(packages)) {
        if (++n > MAX_ENTRIES)
            return null;
        const name = key.startsWith("node_modules/") ? key.slice("node_modules/".length) : "";
        if (!isPackageName(name) || !isRecord(entry) || !fromRegistry(name, entry))
            continue;
        if (typeof entry["name"] === "string" && entry["name"] !== name)
            continue;
        const version = entry["version"];
        if (typeof version === "string" && SEMVER.test(version))
            out[name] = version;
    }
    return out;
}
/**
 * Every package a lockfile installs, by the folder name a manifest uses. Names
 * and versions are kept as written, valid or not, so a caller can name what it
 * cannot check instead of dropping it. Null when it is not a lockfile.
 */
export function lockInstalls(raw) {
    if (!isRecord(raw) || !isRecord(raw["packages"]))
        return null;
    const found = new Map();
    let n = 0;
    for (const [key, entry] of Object.entries(raw["packages"])) {
        if (++n > MAX_ENTRIES)
            return null;
        const at = key.lastIndexOf("node_modules/");
        // The root ("") and workspace folders are not installed packages; a
        // workspace link carries no version of its own.
        if (at < 0 || !isRecord(entry) || entry["link"] === true)
            continue;
        const name = key.slice(at + "node_modules/".length);
        const version = typeof entry["version"] === "string" ? entry["version"] : "";
        const cur = found.get(name) ?? { versions: new Set(), verifiable: true };
        cur.versions.add(version);
        if ((typeof entry["name"] === "string" && entry["name"] !== name) || !fromRegistry(name, entry))
            cur.verifiable = false;
        found.set(name, cur);
    }
    return new Map([...found].map(([name, v]) => [name, { versions: [...v.versions].sort(), verifiable: v.verifiable }]));
}
/** A workspace file read through one handle within the cap, or null. */
export async function readWorkspaceText(path) {
    const r = await readWorkspaceFile(path);
    return r.kind === "read" ? r.text : null;
}
export const snapshotPath = (ws) => join(cacheDir(ws), FILE);
export async function writeAdvisorySnapshot(ws, snapshot) {
    // The directory ignores itself: `.3c/` is not gitignored by default.
    await writeCacheFile(ws, ".gitignore", "*\n");
    await writeCacheFile(ws, FILE, JSON.stringify(snapshot));
}
function toVersions(raw) {
    if (!isRecord(raw))
        return null;
    const entries = Object.entries(raw);
    if (entries.length > MAX_ENTRIES)
        return null;
    for (const [name, v] of entries)
        if (!isPackageName(name) || typeof v !== "string" || !SEMVER.test(v))
            return null;
    return Object.fromEntries(entries);
}
function toSnapshot(raw, now) {
    if (!isRecord(raw) || raw["schema"] !== 1 || raw["source"] !== "npm audit")
        return null;
    const { npmVersion, generatedAt, advisories } = raw;
    if (typeof npmVersion !== "string" || !SEMVER.test(npmVersion))
        return null;
    if (typeof generatedAt !== "string" || generatedAt.length > 64)
        return null;
    const at = Date.parse(generatedAt);
    if (Number.isNaN(at) || at > now.getTime() + MAX_FUTURE_MS)
        return null;
    const audited = toVersions(raw["audited"]);
    if (audited === null || !isRecord(advisories) || Object.keys(advisories).length > MAX_ENTRIES)
        return null;
    const out = {};
    for (const [name, a] of Object.entries(advisories)) {
        if (!isPackageName(name) || !isRecord(a))
            return null;
        const { severity, id } = a;
        if (typeof severity !== "string" || !SEVERITIES.has(severity) || typeof id !== "string" || !ADVISORY_ID.test(id))
            return null;
        out[name] = { severity: severity, id };
    }
    return { schema: 1, source: "npm audit", npmVersion, generatedAt, audited, advisories: out };
}
export async function readAdvisorySnapshot(ws, now = new Date()) {
    const r = await readWorkspaceFile(snapshotPath(ws));
    if (r.kind === "absent")
        return r;
    if (r.kind !== "read")
        return { kind: "invalid" };
    try {
        const snapshot = toSnapshot(JSON.parse(r.text), now);
        return snapshot === null ? { kind: "invalid" } : { kind: "found", snapshot };
    }
    catch {
        return { kind: "invalid" };
    }
}
export function toDepAdvisory(snapshot) {
    return Object.fromEntries(Object.entries(snapshot.advisories).map(([name, a]) => [name, { severity: a.severity, cve: a.id }]));
}
/** Whole days since the snapshot was taken; a date slightly in the future counts as today. */
export function ageInDays(snapshot, now) {
    return Math.max(0, Math.floor((now.getTime() - Date.parse(snapshot.generatedAt)) / DAY_MS));
}
//# sourceMappingURL=advisories.js.map