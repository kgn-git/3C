// The dependency half of the scan: which added dependencies the saved advisory
// list can speak for, and what the gate says about the rest. Offline: it reads
// the snapshot `security refresh` wrote and the lockfile, nothing else.
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { join } from "node:path";
import { ageInDays, isPackageName, lockInstalls, readAdvisorySnapshot, readWorkspaceFile, readWorkspaceText, STALE_AFTER_DAYS, toDepAdvisory, } from "./advisories.js";
import { checkDeps } from "./deps.js";
const NAMES_SHOWN = 10;
const SHOWN_CHARS = 60;
// A name npm would not accept is quoted with every character outside printable
// ASCII written as \uXXXX, so no control, C1 or bidirectional character reaches
// the terminal; it is shortened before escaping so no escape is cut in half.
const shown = (n) => {
    if (isPackageName(n))
        return n;
    const head = [...n].slice(0, SHOWN_CHARS).join("");
    const escaped = head.replace(/[^\x20-\x7e]|["\\]/gu, (c) => (c === '"' || c === "\\" ? `\\${c}` : [...c].map((u) => `\\u${u.codePointAt(0).toString(16).padStart(4, "0")}`).join("")));
    return `"${escaped}${[...n].length > SHOWN_CHARS ? "…" : ""}"`;
};
const list = (names) => {
    const s = names.map(shown);
    return s.length <= NAMES_SHOWN ? s.join(", ") : `${s.slice(0, NAMES_SHOWN).join(", ")} and ${s.length - NAMES_SHOWN} more`;
};
/**
 * The lockfile's installs now, or null when the lockfile npm installs from
 * cannot be read. npm-shrinkwrap.json wins whenever it exists, so an unreadable
 * one is not replaced by package-lock.json, which npm would not use.
 */
async function currentInstalls(ws) {
    const shrinkwrap = await readWorkspaceFile(join(ws, "npm-shrinkwrap.json"));
    const text = shrinkwrap.kind === "absent" ? await readWorkspaceText(join(ws, "package-lock.json")) : shrinkwrap.kind === "read" ? shrinkwrap.text : null;
    if (text === null)
        return null;
    try {
        return lockInstalls(JSON.parse(text));
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
    const snap = read.snapshot;
    const lock = await currentInstalls(workspaceDir);
    const covered = added.filter((n) => {
        const i = lock?.get(n);
        return (isPackageName(n) && !change.unverifiable.includes(n) && i !== undefined && i.verifiable &&
            i.versions.length === 1 && Object.hasOwn(snap.audited, n) && i.versions[0] === snap.audited[n]);
    });
    const uncovered = added.filter((n) => !covered.includes(n));
    const age = ageInDays(snap, now);
    const taken = new Date(snap.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const advice = [];
    if (uncovered.length > 0 && lock === null) {
        advice.push(`Not checked: ${list(uncovered)}. The lockfile npm installs from cannot be read, so their installed versions are unknown. Run \`npm install\`, then ${refresh}. This blocks nothing.`);
    }
    else if (uncovered.length > 0) {
        advice.push(`Not in the saved advisory list, so not checked: ${list(uncovered)}. Their locked versions are not the ones npm audited. Run ${refresh} to check them. This blocks nothing.`);
    }
    if (age > STALE_AFTER_DAYS)
        advice.push(`The saved advisory list is ${age} days old. Run ${refresh} to update it. This blocks nothing.`);
    return {
        kind: "checked",
        findings: checkDeps(covered, toDepAdvisory(snap)),
        note: `dependencies: ${added.length} added, ${covered.length} checked against the npm audit list of ${taken} (${age} ${age === 1 ? "day" : "days"} old)`,
        advice,
    };
}
//# sourceMappingURL=dependency-check.js.map