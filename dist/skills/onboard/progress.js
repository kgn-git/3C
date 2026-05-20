// #15 AC2/AC3 — per-developer onboarding progress as local YAML, reusing the
// bypass.ts local-state pattern. Survives workspace resets; never leaves the
// workstation (NFR-SEC-01). Corrupt/missing → fresh progress (NFR-USE-03).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
function dir(ws) {
    return join(ws, `.${resolveBrandSlugSync()}`, "onboarding");
}
function file(ws, user) {
    return join(dir(ws), `${user}.yaml`);
}
function fresh(user) {
    return { user, level: null, completed: [], current: null };
}
export async function loadProgress(ws, user) {
    let raw;
    try {
        raw = yaml.load(await readFile(file(ws, user), "utf8"));
    }
    catch {
        return fresh(user);
    }
    if (!raw || typeof raw !== "object")
        return fresh(user);
    const o = raw;
    return {
        user,
        level: typeof o.level === "string" ? o.level : null,
        completed: Array.isArray(o.completed)
            ? o.completed.filter((x) => typeof x === "string")
            : [],
        current: typeof o.current === "string" ? o.current : null,
    };
}
export async function saveProgress(ws, user, p) {
    await mkdir(dir(ws), { recursive: true });
    await writeFile(file(ws, user), yaml.dump({
        user: p.user,
        level: p.level,
        completed: [...p.completed],
        current: p.current,
    }), "utf8");
}
//# sourceMappingURL=progress.js.map