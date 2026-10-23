// Per-developer onboarding progress as local YAML; it never leaves the
// workstation (NFR-SEC-01), and corrupt or missing means fresh (NFR-USE-03).
import * as yaml from "js-yaml";
import { isKnownRole } from "./roadmap.js";
import { readOnboardingFile, writeOnboardingFile } from "./user-path.js";
function fresh(user) {
    return { user, level: null, role: null, completed: [], current: null };
}
export async function loadProgress(ws, user) {
    // The dashboard enumerates stems from a directory anyone can drop a file
    // into, so anything unsafe to read is answered as fresh progress.
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
    // Allow-listed, not just type-checked: `runOnboard` falls back to the stored
    // role, and `buildRoadmap` throws on an unknown one, which would break every
    // later run. The drop is reported via `droppedRole`, not left silent.
    const storedRole = typeof o.role === "string" ? o.role : null;
    const role = storedRole !== null && isKnownRole(storedRole) ? storedRole : null;
    const droppedRole = storedRole !== null && role === null ? storedRole : null;
    // Legacy records stored a role in `level`. No maturity label collides with a
    // role name and role module ids are unchanged, so `completed` and `current`
    // carry over. Gated on the `role` KEY's absence, not a null value: a dropped
    // role is saved as `role: null`, which must not re-migrate on the next run.
    // `Object.hasOwn` keeps the prototype chain out of the test.
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