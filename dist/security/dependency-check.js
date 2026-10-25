// The dependency half of the scan: which added dependencies the saved advisory
// list can speak for, and what the gate says about the rest. Offline: it reads
// the snapshot `security refresh` wrote and the lockfile, nothing else.
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { join } from "node:path";
import { ageInDays, isPackageName, lockInstalls, readAdvisorySnapshot, readWorkspaceFile, readWorkspaceText, STALE_AFTER_DAYS, toDepAdvisory, } from "./advisories.js";
import { checkDeps } from "./deps.js";
import { MAX_MANIFEST_BYTES } from "./files.js";
import { SEVERITY_ORDER } from "./severity.js";
import { declaredAliasesOf, isLockfile } from "./manifest-diff.js";
const NAMES_SHOWN = 10;
const SHOWN_CHARS = 60;
// Every character outside printable ASCII is written as \uXXXX, or \u{…} above
// U+FFFF, so no control, C1 or bidirectional character reaches the terminal.
const printable = (s) => s.replace(/[^\x20-\x7e]|["\\]/gu, (c) => {
    if (c === '"' || c === "\\")
        return `\\${c}`;
    const cp = c.codePointAt(0);
    return cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, "0")}`;
});
// A name npm would not accept is quoted, and shortened before escaping so no
// escape is cut in half.
const shown = (n) => {
    if (isPackageName(n))
        return n;
    const head = [...n].slice(0, SHOWN_CHARS).join("");
    return `"${printable(head)}${[...n].length > SHOWN_CHARS ? "…" : ""}"`;
};
const MIB = `${MAX_MANIFEST_BYTES / 1024 / 1024} MiB`;
/** What the gate says about manifests in a change that it cannot read, each kind in its own terms. */
export function unreadableManifests(paths) {
    const rules = [
        ...(paths.some(isLockfile) ? [`A lockfile must be version 2 or 3 (npm 7 or later), at most ${MIB}, and not a link.`] : []),
        ...(paths.some((p) => !isLockfile(p)) ? [`A package.json must be a JSON object, at most ${MIB}, and not a link.`] : []),
    ];
    return `${paths.map(printable).join(", ")} in this change cannot be read, so the dependencies it adds cannot be checked. ${rules.join(" ")} Fix the file, then run the scan again.`;
}
/**
 * One finding per id, at the most severe level any route gave it. A name can
 * reach the same id by its own advisory and by its alias target's, and a
 * transitive id (`via <package>`) is shared by packages npm rates differently;
 * keeping the first or last would let the lower rating decide whether it blocks.
 */
function mostSevereById(findings) {
    const byId = new Map();
    for (const f of findings) {
        const seen = byId.get(f.id);
        if (seen === undefined || SEVERITY_ORDER.indexOf(f.severity) < SEVERITY_ORDER.indexOf(seen.severity))
            byId.set(f.id, f);
    }
    return [...byId.values()];
}
const list = (names) => {
    const s = names.map(shown);
    return s.length <= NAMES_SHOWN ? s.join(", ") : `${s.slice(0, NAMES_SHOWN).join(", ")} and ${s.length - NAMES_SHOWN} more`;
};
/**
 * The lockfile's installs now, or null when the lockfile npm installs from
 * cannot be read. npm-shrinkwrap.json wins whenever it exists, so an unreadable
 * one is not replaced by package-lock.json, which npm would not use.
 */
async function currentInstalls(ws, registry) {
    const shrinkwrap = await readWorkspaceFile(join(ws, "npm-shrinkwrap.json"));
    const text = shrinkwrap.kind === "absent" ? await readWorkspaceText(join(ws, "package-lock.json")) : shrinkwrap.kind === "read" ? shrinkwrap.text : null;
    if (text === null)
        return null;
    try {
        return lockInstalls(JSON.parse(text), registry, declaredAliasesOf(await readWorkspaceText(join(ws, "package.json"))));
    }
    catch {
        return null;
    }
}
/**
 * An added or changed dependency is checked only when every copy the lockfile
 * installs is the one registry version npm audited, under its own name. npm's
 * report speaks for that alone, so a second copy, an alias, a git, file or URL
 * source, or a name npm would not accept is named as not checked rather than
 * counted as clean.
 */
export async function checkDependencies(workspaceDir, change, injected, now = new Date()) {
    const added = change.names;
    const slug = resolveBrandSlugSync();
    const refresh = `\`${slug} security refresh\``;
    if (injected !== undefined) {
        return { kind: "checked", findings: checkDeps(added, injected), note: `dependencies: ${added.length} added, checked against the advisory source`, advice: [] };
    }
    const read = await readAdvisorySnapshot(workspaceDir, now);
    if (read.kind === "invalid") {
        // An edited list could hide a package; with nothing added there is nothing it could hide.
        if (added.length > 0)
            return { kind: "unreadable" };
        return { kind: "checked", findings: [], note: `dependencies: none added (the saved advisory list cannot be used; run ${refresh})`, advice: [] };
    }
    if (read.kind === "absent") {
        return { kind: "checked", findings: [], note: `dependencies: not checked, no saved advisory list (run ${refresh}; this blocks nothing)`, advice: [] };
    }
    if (read.kind === "outdated") {
        // Like an unusable list, it fails closed only when it has something to speak for.
        if (added.length > 0)
            return { kind: "outdated" };
        return { kind: "checked", findings: [], note: `dependencies: none added (the saved advisory list was made by an earlier version; run ${refresh})`, advice: [] };
    }
    const snap = read.snapshot;
    const lock = await currentInstalls(workspaceDir, snap.registry);
    const covered = added.filter((n) => {
        const i = lock?.get(n);
        return (isPackageName(n) && !change.unverifiable.includes(n) && i !== undefined && i.verifiable &&
            i.versions.length === 1 && Object.hasOwn(snap.audited, n) && i.versions[0] === snap.audited[n]);
    });
    // A package the list flags, with a copy under its own lockfile name at the
    // version npm audited, is reported whatever that copy's source: another
    // source must not turn a known advisory into a pass. An alias is another
    // package.
    const flagged = added.filter((n) => {
        const i = lock?.get(n);
        return (!covered.includes(n) && isPackageName(n) && i !== undefined &&
            Object.hasOwn(snap.advisories, n) && Object.hasOwn(snap.audited, n) && i.ownVersions.includes(snap.audited[n]));
    });
    // npm audit reports a declared alias under its target's name, so a record
    // refresh made for the same target at the version locked now lets the
    // target's advisory speak for the alias. Every advisory is read from `base`,
    // never from a map being edited, so the order aliases are declared in
    // cannot decide what is reported.
    const base = toDepAdvisory(snap);
    const aliasTargets = new Map();
    for (const n of added) {
        const a = lock?.get(n)?.aliasOf;
        const rec = Object.hasOwn(snap.aliases, n) ? snap.aliases[n] : undefined;
        if (a !== undefined && rec !== undefined && rec.target === a.target && rec.version === a.version) {
            aliasTargets.set(n, { target: a.target, sole: a.sole });
        }
    }
    // Only an alias that is the only copy under its name is checked through its
    // target, and only it drops the advisory listed under the name: any other
    // copy there still needs an audit of its own, and so does a name another
    // manifest in the change declares from a non-registry source. A sole alias
    // has no copy of the name itself, so it is never also covered or flagged.
    const viaAlias = new Set(added.filter((n) => aliasTargets.get(n)?.sole === true && !change.aliasBlocked.includes(n)));
    const unaliased = Object.fromEntries(Object.entries(base).filter(([name]) => !viaAlias.has(name)));
    const targetFindings = [...aliasTargets].flatMap(([n, { target }]) => Object.hasOwn(base, target) ? checkDeps([n], { [n]: base[target] }) : []);
    const reported = [...covered, ...flagged, ...viaAlias];
    const uncovered = added.filter((n) => !reported.includes(n));
    const age = ageInDays(snap, now);
    const taken = new Date(snap.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const advice = [];
    if (uncovered.length > 0 && lock === null) {
        advice.push(`Not checked: ${list(uncovered)}. The lockfile npm installs from cannot be read, so their installed versions are unknown. Run \`npm install\`, then ${refresh}. This blocks nothing.`);
    }
    else if (uncovered.length > 0) {
        advice.push(`Not in the saved advisory list, so not checked: ${list(uncovered)}. Their locked version or source is not the one npm audited. Run ${refresh} to check them. This blocks nothing.`);
    }
    if (age > STALE_AFTER_DAYS)
        advice.push(`The saved advisory list is ${age} days old. Run ${refresh} to update it. This blocks nothing.`);
    return {
        kind: "checked",
        findings: mostSevereById([...checkDeps(reported, unaliased), ...targetFindings]),
        note: `dependencies: ${added.length} added, ${reported.length} checked against the npm audit list of ${taken} (${age} ${age === 1 ? "day" : "days"} old)`,
        advice,
    };
}
//# sourceMappingURL=dependency-check.js.map