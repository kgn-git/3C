// Gathers what the developer view stands on from the workspace's own files: the memory, the lessons file, the cached
// merge dates already in `source`, and the skills installed. It calls no network; the caller supplies the delivery
// source it has already read or refreshed.
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { gitIn } from "../../memory/git-probe.js";
import { deriveLessons } from "../../memory/lessons.js";
import { readLessons } from "../../memory/lessons-file.js";
import { dateCaveat, mergeDates } from "../../memory/lessons-load.js";
import { readUsableStore } from "../../memory/store-gate.js";
import { promptSkills } from "./prompt-skills.js";
import { developerView } from "./developer.js";
export async function installedSkills(ws) {
    const found = new Set();
    for (const name of promptSkills()) {
        try {
            if ((await lstat(join(ws, ".claude", "skills", name, "SKILL.md"))).isFile())
                found.add(name);
        }
        catch {
            // A skill that cannot be read is a skill the prompt cannot start.
        }
    }
    return found;
}
async function lessonsFor(env, notes) {
    const file = await readLessons(env.cwd);
    if (file.kind !== "found")
        return file;
    const derived = deriveLessons({ lessons: file.lessons, notes, merged: mergeDates(env.source), now: env.now });
    return derived.kind === "refused" ? derived : { kind: "week", weekly: derived.weekly, caveat: dateCaveat(env.source) };
}
export async function loadDeveloperView(env) {
    const memory = env.memory ?? (await readUsableStore(env.cwd, env.git ?? gitIn(env.cwd), env.limits));
    const lessons = memory.kind === "usable" ? await lessonsFor(env, memory.store.notes) : { kind: "absent" };
    return developerView({ memory, source: env.source, lessons, installed: await installedSkills(env.cwd) });
}
//# sourceMappingURL=developer-load.js.map