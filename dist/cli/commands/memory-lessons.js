import { loadDelivery } from "../../handovers/delivery-source.js";
import { memoryDeps } from "../../memory/open-issues.js";
import { NO_STORE_LINE } from "../../memory/brief-render.js";
import { gitIn } from "../../memory/git-probe.js";
import { deriveLessons } from "../../memory/lessons.js";
import { readLessons } from "../../memory/lessons-file.js";
import { ABSENT_LINES, EMPTY_LINES, refusedLines, renderLessons } from "../../memory/lessons-render.js";
import { dateCaveat, mergeDates } from "../../memory/lessons-load.js";
import { lessonsTrust } from "../../memory/lessons-trust.js";
import { readUsableStore, refusalLines } from "../../memory/store-gate.js";
/**
 * `3c memory lessons`: each lesson's figures, its exclusions and the week's new matches; exit 1 when the file or the
 * memory is refused. It refreshes a stale delivery cache first, as `3c dashboard` does, and writes nothing else.
 */
export async function lessonsCommand(env) {
    const file = await readLessons(env.cwd);
    if (file.kind === "absent" || file.kind === "empty") {
        for (const line of file.kind === "absent" ? ABSENT_LINES : EMPTY_LINES)
            env.log(line);
        return 0;
    }
    if (file.kind === "refused") {
        for (const line of refusedLines(file.where, file.why))
            env.error(line);
        return 1;
    }
    const run = env.git ?? gitIn(env.cwd);
    const used = await readUsableStore(env.cwd, run, env.limits);
    if (used.kind === "absent") {
        env.log(NO_STORE_LINE);
        return 0;
    }
    if (used.kind === "refused") {
        for (const line of refusalLines("Memory lessons", used.refusal))
            env.error(line);
        return 1;
    }
    const deps = env.deps ?? memoryDeps;
    const source = await loadDelivery(env.cwd, deps);
    const merged = mergeDates(source);
    const now = deps.now();
    const derived = deriveLessons({ lessons: file.lessons, notes: used.store.notes, merged, now });
    if (derived.kind === "refused") {
        for (const line of refusedLines(derived.where, derived.why))
            env.error(line);
        return 1;
    }
    const trust = await lessonsTrust(run);
    env.log(renderLessons(derived, { trust, syncedAt: used.store.meta.syncedAt, now, caveat: dateCaveat(source) }).join("\n"));
    return 0;
}
//# sourceMappingURL=memory-lessons.js.map