// #346 (for #343): onboarding's own mapping to the shared convention. Lives
// with the skill for the same reason as src/skills/findings/present.ts — #343
// adopts the convention on the console surface by calling this function rather
// than restating these sentences.
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** Status only: no activity trail, no analytics, no egress (NFR-SEC-01). */
export function presentOnboarding(progress) {
    if (progress.length === 0) {
        return {
            results: "No onboarding in progress.",
            meaning: "Nobody has started a guided onboarding in this workspace.",
            nextSteps: ["3c onboard"],
        };
    }
    // `level` and `role` are rendered separately since #399 split them. Before
    // the fold this line printed "level frontend" — the `onboard-guide` role,
    // shown under the other command's vocabulary, on the dashboard.
    const results = progress
        .map((p) => `${p.user}: ${plural(p.completed.length, "module")} complete` +
        `${p.level !== null ? ` · level ${p.level}` : ""}` +
        `${p.role !== null ? ` · ${p.role}` : ""}` +
        // #343 board: say WHO has finished, not only how many.
        `${p.current !== null ? ` · on ${p.current}` : " · finished"}`)
        .join("\n");
    // #343 AC6. A record with no current module has FINISHED: `runOnboard` seeds
    // a current module on first contact, and only advancing past the last one
    // (or a stale-id pass resuming "at the end") leaves it null. This used to say
    // "onboarding has stalled" and offer `3c onboard` — which, for a finished
    // developer, only reprints "All modules complete": a loop, sent from the
    // dashboard. A finished developer needs nothing from this panel.
    const finished = progress.filter((p) => p.current === null).length;
    const meaning = finished === 0
        ? `${plural(progress.length, "developer")} ${progress.length === 1 ? "has" : "have"} onboarding in progress, each with a current module.`
        : `${finished} of ${plural(progress.length, "developer")} ${finished === 1 ? "has" : "have"} finished onboarding; ${progress.length - finished} in progress.`;
    return { results, meaning, nextSteps: [] };
}
/**
 * #343 AC1. The lines that end every `onboard` run: how far along the developer
 * is and the exact next command. Pure, so each state is testable without the CLI.
 *
 * Suggested commands never carry `--role`: the role is remembered in the record
 * (#399), and repeating it would invite a typo that changes the roadmap.
 */
export function onboardNextLines(roadmapIds, progress, ctx) {
    const u = ctx.explicitUser === null ? "" : ` --user ${ctx.explicitUser}`;
    const done = progress.completed.filter((id) => roadmapIds.includes(id)).length;
    const lines = [`Done: ${done} of ${roadmapIds.length} modules.`];
    const current = progress.current;
    if (current !== null) {
        // Named only when it is a module of this roadmap: the record is a file
        // anyone can edit, and the stale-id pass upstream is not this printer's
        // guarantee to rely on (#343 board, security lens).
        const named = roadmapIds.includes(current) ? current : null;
        const isLast = named !== null && roadmapIds[roadmapIds.length - 1] === named;
        lines.push(`Next: ${ctx.slug} onboard --advance${u}  — ` +
            (named === null
                ? "mark the current module done and move on"
                : isLast
                    ? `\`${named}\` is the last module; this finishes onboarding`
                    : `mark \`${named}\` done and move on`), `Ask: ${ctx.slug} onboard --ask "<question>"${u}`);
    }
    else if (ctx.starter?.kind === "found") {
        lines.push(`Next: start on #${ctx.starter.number}, the starter task above`);
    }
    else if (ctx.starter !== undefined) {
        lines.push("Next: ask your lead for a first task");
    }
    else {
        lines.push(`Next: ${ctx.slug} onboard --starter${u}  — pick a first task`);
    }
    // #343 AC2: the progress view is the dashboard (product decision, 16 Oct) —
    // no per-developer page.
    lines.push(`Progress: ${ctx.slug} dashboard`);
    return lines;
}
//# sourceMappingURL=present.js.map