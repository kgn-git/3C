// #15 VP-02-F09 — onboarding skill compose. Seeds the roadmap, resumes from
// persisted progress, advances modules, answers from local sources, and
// recommends a level-appropriate starter task. Primitive (no #22 dep).
import { loadProgress, saveProgress } from "./progress.js";
import { buildRoadmap } from "./roadmap.js";
import { answerFromSources } from "./answer.js";
import { recommendStarter } from "./starter.js";
export async function runOnboard(ws, opts) {
    const roadmap = await buildRoadmap(ws);
    let progress = await loadProgress(ws, opts.user);
    // Seed on first contact; keep level if supplied.
    if (progress.current === null && progress.completed.length === 0) {
        progress = {
            user: opts.user,
            level: opts.level ?? progress.level,
            completed: [],
            current: roadmap[0]?.id ?? null,
        };
        await saveProgress(ws, opts.user, progress);
    }
    else if (opts.level && opts.level !== progress.level) {
        progress = { ...progress, level: opts.level };
        await saveProgress(ws, opts.user, progress);
    }
    if (opts.action === "advance" && progress.current !== null) {
        const ids = roadmap.map((m) => m.id);
        const idx = ids.indexOf(progress.current);
        const completed = progress.completed.includes(progress.current)
            ? progress.completed
            : [...progress.completed, progress.current];
        const next = idx >= 0 && idx + 1 < ids.length ? ids[idx + 1] : null;
        progress = { ...progress, completed, current: next };
        await saveProgress(ws, opts.user, progress);
    }
    const result = { roadmap, progress };
    if (opts.action === "ask") {
        result.answer = await answerFromSources(ws, opts.query ?? "");
    }
    if (opts.action === "starter") {
        result.starter = opts.spawn
            ? await recommendStarter(ws, opts.level ?? "good-first", opts.spawn)
            : null;
    }
    return result;
}
//# sourceMappingURL=index.js.map