// Gathers what the manager view stands on from the workspace's own files: the memory, the lessons file and the skills
// installed. The delivery source is supplied by the caller, which has already read or refreshed it; nothing here calls the network.
import { gitIn } from "../../memory/git-probe.js";
import { deriveLessons } from "../../memory/lessons.js";
import { readLessons } from "../../memory/lessons-file.js";
import { mergeDates } from "../../memory/lessons-load.js";
import { readUsableStore } from "../../memory/store-gate.js";
import { installedSkills } from "./developer-load.js";
import { managerView } from "./manager.js";
async function lessonsFor(env, notes) {
    const file = await readLessons(env.cwd);
    if (file.kind !== "found")
        return file;
    const derived = deriveLessons({ lessons: file.lessons, notes, merged: mergeDates(env.source), now: env.now });
    if (derived.kind === "refused")
        return derived;
    return { kind: "matches", handovers: new Set(derived.lessons.flatMap((l) => l.matches)) };
}
export async function loadManagerView(env) {
    const memory = env.memory ?? (await readUsableStore(env.cwd, env.git ?? gitIn(env.cwd), env.limits));
    const lessons = memory.kind === "usable" ? await lessonsFor(env, memory.store.notes) : { kind: "absent" };
    return managerView({ memory, source: env.source, lessons, installed: await installedSkills(env.cwd), now: env.now, withPrompts: env.withPrompts ?? true });
}
//# sourceMappingURL=manager-load.js.map