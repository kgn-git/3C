// #22 VP-06-F01 — Interactive Onboarding Guide. The guided-UX layer OVER #15:
// reuses #15 progress (pause/resume) + answerFromSources, adds role-tailored
// roadmaps, module status, and local-first completion. AD-10 skill.
import { loadProgress, saveProgress } from "../onboard/progress.js";
import { answerFromSources } from "../onboard/answer.js";
import { roleRoadmap } from "./roles.js";
import { moduleStatus } from "./view.js";
import { recordCompletion } from "./completion.js";
export async function runOnboardGuide(ws, opts) {
    const roadmap = roleRoadmap(opts.role);
    const ids = roadmap.map((m) => m.id);
    let progress = await loadProgress(ws, opts.user);
    // Seed (first contact) or re-seed when the developer's role changed —
    // the role's modules become their roadmap.
    const onThisRole = progress.level === opts.role && progress.current !== null;
    const knownIds = progress.completed.every((c) => ids.includes(c)) &&
        (progress.current === null || ids.includes(progress.current));
    if (!onThisRole || !knownIds) {
        progress = {
            user: opts.user,
            level: opts.role,
            completed: [],
            current: ids[0] ?? null,
        };
        await saveProgress(ws, opts.user, progress);
    }
    let completedAll = false;
    if (opts.action === "advance" && progress.current !== null) {
        const idx = ids.indexOf(progress.current);
        const completed = progress.completed.includes(progress.current)
            ? progress.completed
            : [...progress.completed, progress.current];
        const next = idx >= 0 && idx + 1 < ids.length ? ids[idx + 1] : null;
        progress = { ...progress, completed, current: next };
        await saveProgress(ws, opts.user, progress);
        if (next === null) {
            completedAll = true;
            // AC5: local-first completion artifact (+ optional configured command).
            await recordCompletion(ws, opts.user, opts.runner);
        }
    }
    const result = {
        roadmap,
        status: moduleStatus(roadmap, progress),
        progress,
        completedAll,
    };
    if (opts.action === "ask") {
        // AC4: reuse #15's local-only answer source (standards + docs).
        result.answer = await answerFromSources(ws, opts.query ?? "");
    }
    return result;
}
//# sourceMappingURL=index.js.map