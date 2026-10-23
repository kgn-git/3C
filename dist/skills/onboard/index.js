// Onboarding skill compose. Seeds the roadmap, resumes from persisted
// progress, advances modules, answers from local sources, and recommends a
// level-appropriate starter task.
//
// Role-based onboarding is `--role` here, not a second command: two commands
// sharing one state file would write conflicting meanings into its `level`
// field, each re-seeding the record the other had written.
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { loadProgress, saveProgress } from "./progress.js";
import { KNOWN_ROLES, buildRoadmap } from "./roadmap.js";
import { answerFromSources } from "./answer.js";
import { recordCompletion } from "./completion.js";
import { findStarter } from "./starter.js";
/**
 * A stored value made safe to print (CWE-117).
 *
 * The notices below quote values read off disk back to the terminal, and a
 * value carrying ESC or CR can erase and rewrite the line it appears on — so a
 * record could forge the message about itself. `.3c/onboarding/` is the
 * developer's own gitignored file today, which is why this is small rather than
 * absent; the echo path is the thing worth getting right, because the next
 * value routed through it may not be self-authored. Length-capped for the same
 * reason `excerptBody` exists: a stored string is unbounded input.
 */
export function forConsole(value) {
    // eslint-disable-next-line no-control-regex
    const stripped = value.replace(/[\u0000-\u001f\u007f]/g, "?");
    return stripped.length > 60 ? `${stripped.slice(0, 60)}…` : stripped;
}
export async function runOnboard(ws, opts) {
    // `droppedRole` is a diagnostic from the read, not part of the record. Split
    // it off here so it cannot ride the `{...progress}` spreads below into the
    // object this function RETURNS — its own doc comment says it is never written
    // back, and a field that survives on a widely-spread shape is one `--json`
    // flag away from being published. `saveProgress` picks fields explicitly, so
    // disk was never at risk; this closes the return path too.
    const loaded = await loadProgress(ws, opts.user);
    const droppedRole = loaded.droppedRole ?? null;
    const { droppedRole: _diagnostic, ...withoutDiagnostic } = loaded;
    let progress = withoutDiagnostic;
    // A stored role is REMEMBERED, so resuming needs no flag and a legacy
    // `onboard-guide` record keeps its roadmap across the fold. An explicit
    // `--role` still wins, which is how a developer changes roles.
    const role = opts.role ?? progress.role;
    const roadmap = await buildRoadmap(ws, role);
    const ids = roadmap.map((m) => m.id);
    // Seed on first contact only. The gate requires BOTH fields empty, which is
    // what keeps a FINISHED record (current null, completed full) from
    // re-seeding at terminal state.
    if (progress.current === null && progress.completed.length === 0) {
        progress = {
            user: opts.user,
            level: opts.level ?? progress.level,
            role: role ?? null,
            completed: [],
            current: ids[0] ?? null,
        };
        await saveProgress(ws, opts.user, progress);
    }
    else if ((opts.level !== undefined && opts.level !== progress.level) ||
        (role ?? null) !== progress.role ||
        // A dropped role leaves `progress.role` already null, so the comparison
        // above is null-vs-null and would not re-persist — and the FILE would keep
        // the unrecognised value, re-dropped and re-reported on every run forever.
        // Saving here is what makes the correction stick.
        droppedRole !== null) {
        progress = { ...progress, level: opts.level ?? progress.level, role: role ?? null };
        await saveProgress(ws, opts.user, progress);
    }
    // Ids the active roadmap does not contain — a record written against a
    // different role, or a hand-edited file. They are DROPPED and REPORTED, never
    // silently reset (AC3), and never left in place: leaving one in `current` is
    // what made `indexOf` return -1, `next` become null, and a single `--advance`
    // print "All modules complete." on a roadmap the developer never saw.
    // A role the build no longer recognises is discarded by `loadProgress`. That
    // has to be SAID: with valid module ids the stale pass below never fires, so
    // the role vanished, the record kept the old value, and the developer was
    // never told — a silent divergence between the file and what is applied.
    const notes = [];
    if (droppedRole !== null) {
        notes.push(`Ignoring stored role \`${forConsole(droppedRole)}\` — this version knows only ` +
            `${KNOWN_ROLES.join(", ")}. Set one with, e.g., ` +
            // A runnable command, not "re-run with --role" — and a
            // concrete one: `<a|b|c>` is a redirect and a pipe when pasted.
            `\`${resolveBrandSlugSync()} onboard --role ${KNOWN_ROLES[1] ?? KNOWN_ROLES[0]}` +
            `${opts.explicitUser ? ` --user ${opts.user}` : ""}\` (roles: ${KNOWN_ROLES.join(", ")}).`);
    }
    const stale = [...progress.completed, ...(progress.current === null ? [] : [progress.current])]
        .filter((id) => !ids.includes(id));
    if (stale.length > 0) {
        const completed = progress.completed.filter((id) => ids.includes(id));
        const next = ids.find((id) => !completed.includes(id)) ?? null;
        progress = { ...progress, completed, current: next };
        await saveProgress(ws, opts.user, progress);
        notes.push(`Dropped ${stale.length} module id(s) not in this roadmap: ${[...new Set(stale)].join(", ")}. ` +
            `Resuming at ${next ?? "the end"}.`);
    }
    // A FINISHED record (no current module) whose roadmap has since gained
    // modules — a developer who completes onboarding, then adds `--role` — must
    // resume here. The seed gate needs `completed` empty and the stale pass only
    // drops ids, so `current` would stay null: the role's modules unreachable
    // while the output says "All modules complete".
    if (progress.current === null && progress.completed.length > 0) {
        const done = progress.completed;
        const next = ids.find((id) => !done.includes(id)) ?? null;
        if (next !== null) {
            progress = { ...progress, current: next };
            await saveProgress(ws, opts.user, progress);
            notes.push(`The roadmap gained modules since you finished; resuming at \`${next}\`.`);
        }
    }
    const invalidated = notes.length > 0 ? notes.join(" ") : null;
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
            await recordCompletion(ws, opts.user);
        }
    }
    const result = { roadmap, progress, completedAll, invalidated };
    if (opts.action === "ask") {
        result.answer = await answerFromSources(ws, opts.query ?? "");
    }
    if (opts.action === "starter") {
        const outcome = opts.spawn
            ? await findStarter(ws, opts.level ?? "good-first", opts.spawn)
            : { kind: "unavailable" };
        result.starterOutcome = outcome;
        result.starter = outcome.kind === "found" ? outcome.task : null;
    }
    return result;
}
//# sourceMappingURL=index.js.map