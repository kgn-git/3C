// Which dependencies a change adds or changes, read from the manifests as they
// were at the base and as they are now. A `--unified=0` diff line carries no
// context, so `"version": "1.0.0"` and a dependency look alike there, and a
// compact line holding several dependencies is one line; parsed manifests
// have neither problem. Names are kept as written, valid or not: the gate
// names what it cannot check rather than dropping it.
import { isPackageName, lockInstalls } from "./advisories.js";
const BLOCKS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
// A registry range or tag has neither; `npm:`, `git+…`, `file:`, a URL and
// the `user/repo` shorthand all have one.
const notRegistry = (spec) => /[:/]/.test(spec);
/** The npm aliases a manifest declares (`"foo": "npm:other@1"`), folder name to target. */
export function npmAliases(manifest) {
    const out = new Map();
    if (!isRecord(manifest))
        return out;
    for (const block of BLOCKS) {
        const entries = manifest[block];
        if (!isRecord(entries))
            continue;
        for (const [folder, spec] of Object.entries(entries)) {
            if (typeof spec !== "string" || !spec.startsWith("npm:"))
                continue;
            const rest = spec.slice("npm:".length);
            const at = rest.lastIndexOf("@");
            const target = at > 0 ? rest.slice(0, at) : rest;
            // `"foo": "npm:foo@1"` installs foo under its own name: no alias.
            if (isPackageName(folder) && isPackageName(target) && target !== folder)
                out.set(folder, target);
        }
    }
    return out;
}
/** True when every block of a manifest that declares `name` declares it with an `npm:` spec. */
function onlyNpmAliased(manifest, name) {
    if (!isRecord(manifest))
        return false;
    const specs = BLOCKS.map((b) => manifest[b]).filter(isRecord).filter((e) => Object.hasOwn(e, name)).map((e) => e[name]);
    return specs.length > 0 && specs.every((s) => typeof s === "string" && s.startsWith("npm:"));
}
/**
 * The aliases a package.json text declares. A text that does not parse
 * declares none, so a lockfile name mismatch counts as the package itself:
 * the direction that reports a flagged version rather than hiding it.
 */
export function declaredAliasesOf(text) {
    if (text === null)
        return new Map();
    try {
        return npmAliases(JSON.parse(text));
    }
    catch {
        return new Map();
    }
}
/** True for the two lockfile names npm reads; it prefers npm-shrinkwrap.json. */
export const isLockfile = (path) => /(?:^|\/)(?:package-lock|npm-shrinkwrap)\.json$/.test(path);
/** name → range across every dependency block; a manifest that is not an object yields null. */
function declared(manifest) {
    if (!isRecord(manifest))
        return null;
    const values = new Map();
    const unverifiable = new Set();
    for (const block of BLOCKS) {
        const entries = manifest[block];
        if (!isRecord(entries))
            continue;
        for (const [name, range] of Object.entries(entries)) {
            const spec = typeof range === "string" ? range : JSON.stringify(range);
            values.set(name, spec);
            if (typeof range !== "string" || notRegistry(spec))
                unverifiable.add(name);
        }
    }
    return { values, unverifiable };
}
function locked(lock) {
    const installs = lockInstalls(lock);
    if (installs === null)
        return null;
    const values = new Map();
    const unverifiable = new Set();
    for (const [name, i] of installs) {
        values.set(name, `${i.versions.join(",")} ${i.sources.join(",")}`);
        if (!i.verifiable)
            unverifiable.add(name);
    }
    return { values, unverifiable };
}
function parse(text) {
    if (text === null)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
export function changedDependencies(manifests) {
    const names = [];
    const unverifiable = [];
    const unparseable = [];
    const aliasBlocked = new Set();
    for (const m of manifests) {
        if (m.head === null)
            continue;
        const read = isLockfile(m.path) ? locked : declared;
        const head = read(parse(m.head));
        if (head === null) {
            unparseable.push(m.path);
            continue;
        }
        const base = read(parse(m.base));
        for (const [name, value] of head.values) {
            if (base?.values.get(name) === value)
                continue;
            if (!names.includes(name))
                names.push(name);
            if (head.unverifiable.has(name) && !unverifiable.includes(name))
                unverifiable.push(name);
        }
        // The root lockfile is re-read by the check itself. Any other manifest
        // installs its names in a tree the check never reads, whatever the source.
        const root = !m.path.includes("/");
        if (root && isLockfile(m.path))
            continue;
        const blocked = root ? [...head.unverifiable].filter((n) => !onlyNpmAliased(parse(m.head), n)) : [...head.values.keys()];
        for (const name of blocked)
            aliasBlocked.add(name);
    }
    return { names, unverifiable, unparseable, aliasBlocked: [...aliasBlocked] };
}
//# sourceMappingURL=manifest-diff.js.map