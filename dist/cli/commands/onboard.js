import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { forConsole, runOnboard } from "../../skills/onboard/index.js";
import { onboardNextLines } from "../../skills/onboard/present.js";
import { KNOWN_ROLES, excerptBody, isKnownRole } from "../../skills/onboard/roadmap.js";
import { OnboardPathError, isSafeUser, normaliseDefaultUser } from "../../skills/onboard/user-path.js";
import { flagPresent, flagValue } from "../argv.js";
/**
 * The only text an unusable `--user` produces. It never repeats the
 * value (A10 / CWE-117): the refused input is exactly what must not reach a
 * terminal or a log, and the developer knows what they typed.
 */
function unsafeUserMessage() {
    const slug = resolveBrandSlugSync();
    return ("✗ --user must be a plain name: 1-64 letters, digits, '.', '_' or '-', starting with a " +
        "letter, digit or '_' — no path separators, and not ending in '.'.\n" +
        `  Try: ${slug} onboard --user <safe-name>`);
}
function onboardWriteFailedMessage(code) {
    const slug = resolveBrandSlugSync();
    return (`✗ Could not read or write the onboarding state under .${slug}/onboarding/ (${code}).\n` +
        `  Check it is a writable directory and that no other program holds the file open, then re-run \`${slug} onboard\`.`);
}
function linkedPathMessage() {
    const slug = resolveBrandSlugSync();
    return (`✗ The onboarding state under .${slug}/ is reached through a symbolic link or junction, ` +
        "so it was neither read nor written.\n" +
        `  Remove the link (or move the real directory into place), then re-run \`${slug} onboard\`.`);
}
export async function onboardCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    // An EXPLICIT name is validated and refused, never normalised — mapping
    // two typed names onto one file would be silent. The OS DEFAULT is normalised
    // and never refused: the developer did not type it, and refusing it would make
    // a bare `onboard` unreachable for `DOMAIN\jsmith`. `flagPresent`, so a bare
    // `--user` or `--user=` is an explicit request that is refused rather than
    // silently answered with the OS name.
    let user;
    if (flagPresent(argv, "--user")) {
        const given = flagValue(argv, "--user");
        if (given === undefined || !isSafeUser(given)) {
            log(unsafeUserMessage());
            return 1;
        }
        user = given;
    }
    else {
        user = normaliseDefaultUser((env.osUser ?? (() => userInfo().username))());
    }
    const level = flagValue(argv, "--level");
    const role = flagValue(argv, "--role");
    const ask = flagValue(argv, "--ask");
    const action = ask
        ? "ask"
        : argv.includes("--advance")
            ? "advance"
            : argv.includes("--starter")
                ? "starter"
                : undefined;
    // A bare or empty `--ask` is a request with no question. Falling through as
    // a plain run would answer the developer with the roadmap, in silence.
    // Refused here, like an unusable `--role`.
    if (flagPresent(argv, "--ask") && (ask === undefined || ask.trim() === "")) {
        log(`✗ --ask needs a question: ${resolveBrandSlugSync()} onboard --ask "<question>"`);
        return 1;
    }
    const realSpawn = async (cmd, a) => {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        try {
            const { stdout, stderr } = await promisify(execFile)(cmd, [...a], {
                cwd: env.cwd,
            });
            return { exitCode: 0, stdout, stderr };
        }
        catch (e) {
            const x = e;
            return {
                exitCode: x.code ?? 1,
                stdout: x.stdout ?? "",
                stderr: x.stderr ?? "",
            };
        }
    };
    // Validated at the trust boundary, before anything is written under the
    // developer's name. An unrecognised role falling through to a GENERIC
    // roadmap would let `--role fronted` silently seed a different set of
    // modules with no way for the developer to tell.
    // `flagPresent`, not `argv.includes`: presence and value come from the same
    // parser, so `--role=x` cannot be invisible to one and visible to the other.
    // Presence is what triggers the check rather than `role !== undefined`,
    // because `flagValue` returns undefined both when the flag is absent and when
    // it trails the argv (`3c onboard --role`) — and the second is a developer who
    // asked for a role and would otherwise be handed the generic roadmap in
    // silence. `""` is rejected here too, so this and `buildRoadmap`'s own guard
    // cannot classify the same input differently.
    if (flagPresent(argv, "--role") && (role === undefined || role === "" || !isKnownRole(role))) {
        log(`Unknown role \`${role ?? ""}\` — expected one of: ${KNOWN_ROLES.join(", ")}`);
        return 1;
    }
    let r;
    try {
        r = await runOnboard(env.cwd, {
            user,
            ...(level ? { level } : {}),
            ...(role ? { role } : {}),
            ...(action ? { action } : {}),
            ...(ask ? { query: ask } : {}),
            ...(action === "starter" ? { spawn: env.spawn ?? realSpawn } : {}),
            explicitUser: flagPresent(argv, "--user"),
        });
    }
    catch (err) {
        // Fails CLOSED with a generic line, never a stack trace (A10). A refusal from
        // the path layer says why; any other failure — `rename` EPERM/EBUSY on
        // Windows when the record is open elsewhere, `mkdir` EEXIST/ENOTDIR when
        // `.3c` or `onboarding` is a regular file — names only its errno code, which
        // carries no path.
        if (err instanceof OnboardPathError) {
            log(err.kind === "linked-path" ? linkedPathMessage() : unsafeUserMessage());
            return 1;
        }
        // Only a FILESYSTEM error is translated — one carrying an errno code. A
        // programming error relabelled "could not write onboarding state" would
        // send the developer to check a directory that is fine.
        const code = err.code;
        if (typeof code === "string" && /^E[A-Z]+$/.test(code)) {
            log(onboardWriteFailedMessage(code));
            return 1;
        }
        throw err;
    }
    const shownRole = r.progress.role;
    log(`Onboarding — ${user}${shownRole ? ` (${shownRole})` : ""}`);
    // Never a silent reset: a dropped id is reported before the roadmap, so the
    // developer sees why their position moved.
    if (r.invalidated)
        log(r.invalidated);
    for (const m of r.roadmap) {
        const mark = r.progress.completed.includes(m.id)
            ? "[x]"
            : r.progress.current === m.id
                ? "[>]"
                : "[ ]";
        log(`  ${mark} ${m.id} — ${m.title}`);
    }
    if (r.progress.current) {
        log(`Current: ${r.progress.current}`);
        // The bodies are the project-derived content — CLAUDE.md for
        // `architecture`, package scripts for `workflows` — and without them the
        // output is indistinguishable from a static checklist. Only the CURRENT
        // module's, and excerpted: `architecture`'s body IS the whole of CLAUDE.md.
        const body = r.roadmap.find((m) => m.id === r.progress.current)?.body;
        if (body)
            log(`\n${excerptBody(body)}`);
    }
    else if (r.completedAll) {
        log("All modules complete — completion recorded locally.");
    }
    else {
        log("All modules complete.");
    }
    if (r.answer)
        log(`\n${r.answer}`);
    if (r.starter)
        log(`\nStarter task: #${r.starter.number} — ${forConsole(r.starter.title)}`);
    // A starter request that found nothing must not print nothing. The two
    // misses get different advice — another --level cannot fix a missing gh.
    // The level is the developer's own argument, echoed through forConsole
    // (CWE-117/150: an ESC sequence in it could rewrite the terminal line).
    else if (r.starterOutcome?.kind === "none") {
        log(`\nNo open starter issue labelled \`${forConsole(level ?? "good-first")}\` — try another --level, or ask your lead.`);
    }
    else if (r.starterOutcome?.kind === "unavailable") {
        log("\nCouldn't list starter issues — the GitHub CLI (gh) is unavailable or not signed in. Ask your lead for a first task.");
    }
    // Every state ends with where the developer is and what to run next.
    log("");
    const starter = r.starterOutcome === undefined
        ? undefined
        : r.starterOutcome.kind === "found"
            ? { kind: "found", number: r.starterOutcome.task.number }
            : { kind: r.starterOutcome.kind };
    for (const line of onboardNextLines(r.roadmap.map((m) => m.id), r.progress, {
        slug: resolveBrandSlugSync(),
        explicitUser: flagPresent(argv, "--user") ? user : null,
        ...(starter ? { starter } : {}),
    })) {
        log(line);
    }
    return 0;
}
//# sourceMappingURL=onboard.js.map