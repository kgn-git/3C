// #15 AC2/AC3 — per-developer onboarding progress as local YAML, reusing the
// bypass.ts local-state pattern. Survives workspace resets; never leaves the
// workstation (NFR-SEC-01). Corrupt/missing → fresh progress (NFR-USE-03).
//
// #399 AC3 gave `level` back its single meaning. Before the fold, two commands
// wrote this one field with two different vocabularies — `onboard` a maturity
// level, `onboard-guide` a role — into the same file for the same user, and
// each re-seeded when it did not recognise what the other had written. `role`
// is now its own field, and a legacy record is migrated on read.
import * as yaml from "js-yaml";
import { isKnownRole } from "./roadmap.js";
import { readOnboardingFile, writeOnboardingFile } from "./user-path.js";
function fresh(user) {
    return { user, level: null, role: null, completed: [], current: null };
}
export async function loadProgress(ws, user) {
    // #378 AC6: a reader never throws and never reads outside the tree. The
    // dashboard enumerates stems from a directory anyone can drop a file into, so
    // an unsafe name, a linked path, a non-regular or oversized file are all
    // answered as fresh progress rather than read (`readOnboardingFile`).
    const text = await readOnboardingFile(ws, user);
    if (text === null)
        return fresh(user);
    let raw;
    try {
        raw = yaml.load(text);
    }
    catch {
        return fresh(user);
    }
    if (!raw || typeof raw !== "object")
        return fresh(user);
    const o = raw;
    const level = typeof o.level === "string" ? o.level : null;
    // Allow-listed on READ, not merely type-checked. The CLI screens `--role`,
    // but `runOnboard` falls back to the STORED role, and this file is the one
    // input the module's own header promises to survive ("corrupt/missing →
    // fresh progress"). Without the predicate an unknown role — a hand-edited
    // record, a role a later build renamed, a white-label deployment with its own
    // table — reached `buildRoadmap`, which fails closed by THROWING, and nothing
    // between here and the process entry catches it: `3c onboard` died with a
    // stack trace on every subsequent run, with no way back. Found convergently
    // by the architecture and security lenses.
    //
    // The drop is REPORTED, via `droppedRole`. An earlier version of this comment
    // claimed the stale-id pass in `runOnboard` would cover it; the board showed
    // that is false whenever the record's module ids are still valid — the role
    // was nulled, nothing was said, and the file kept the stale value forever,
    // diverging silently from what was applied. A comment asserting a property a
    // committed test disproves is worse than no comment.
    const storedRole = typeof o.role === "string" ? o.role : null;
    const role = storedRole !== null && isKnownRole(storedRole) ? storedRole : null;
    const droppedRole = storedRole !== null && role === null ? storedRole : null;
    // #399 migration, and it is LOSSLESS by construction: the fold left every
    // role module id unchanged, so a record written by `onboard-guide` can be
    // re-read in full rather than invalidated. A `level` holding one of the three
    // role names is unambiguously a pre-fold role — no maturity label collides
    // with them — so `completed` and `current` carry straight over and the
    // developer resumes exactly where they stopped.
    //
    // Gated on the KEY's absence, not on its value being null — and the
    // difference is a defect the board caught by running the fix twice.
    //
    // A dropped role is persisted as `role: null` so the record stops carrying a
    // value this build rejects. But `null` is not a string, so `storedRole` is
    // null for that record too, and a gate keyed on `storedRole === null` cannot
    // tell "never had a role" from "had one, dropped it, wrote null". Run 1
    // reported the drop and gave the workspace roadmap; run 2 silently installed
    // the legacy `level` as the role and handed over a different roadmap, with no
    // notice — the exact silent divergence this fix was written to close,
    // displaced by one invocation. The committed test asserted run 1 only.
    //
    // A post-fold record always has the key, so its absence is what actually
    // means "written before #399". `Object.hasOwn`, not `in`: every `obj[key]`
    // test on a parsed object walks the prototype chain otherwise.
    if (!Object.hasOwn(o, "role") && level !== null && isKnownRole(level)) {
        return {
            user,
            level: null,
            role: level,
            completed: readIds(o.completed),
            current: typeof o.current === "string" ? o.current : null,
            droppedRole: null,
        };
    }
    return {
        user,
        level,
        role,
        completed: readIds(o.completed),
        current: typeof o.current === "string" ? o.current : null,
        droppedRole,
    };
}
function readIds(v) {
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
export async function saveProgress(ws, user, p) {
    await writeOnboardingFile(ws, user, yaml.dump({
        user: p.user,
        level: p.level,
        role: p.role,
        completed: [...p.completed],
        current: p.current,
    }));
}
//# sourceMappingURL=progress.js.map