// #15 AC5 — recommend a level-appropriate starter task from the backlog via
// an injected gh runner (SpawnFn-shaped; default = real gh in the CLI layer).
export async function findStarter(_ws, levelLabel, spawn) {
    const r = await spawn("gh", [
        "issue",
        "list",
        "--label",
        levelLabel,
        "--state",
        "open",
        "--json",
        "number,title,labels",
    ]);
    // A non-zero exit is gh missing, signed out, or not a GitHub repository —
    // nothing a different label would fix.
    if (r.exitCode !== 0)
        return { kind: "unavailable" };
    let list;
    try {
        list = JSON.parse(r.stdout);
    }
    catch {
        return { kind: "unavailable" };
    }
    if (!Array.isArray(list) || list.length === 0)
        return { kind: "none" };
    const first = list[0];
    if (typeof first.number !== "number" || typeof first.title !== "string") {
        return { kind: "unavailable" };
    }
    return { kind: "found", task: { number: first.number, title: first.title } };
}
/** The task, or null for either kind of miss. */
export async function recommendStarter(ws, levelLabel, spawn) {
    const o = await findStarter(ws, levelLabel, spawn);
    return o.kind === "found" ? o.task : null;
}
//# sourceMappingURL=starter.js.map