// #15 AC5 — recommend a level-appropriate starter task from the backlog via
// an injected gh runner (SpawnFn-shaped; default = real gh in the CLI layer).
export async function recommendStarter(_ws, levelLabel, spawn) {
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
    if (r.exitCode !== 0)
        return null;
    let list;
    try {
        list = JSON.parse(r.stdout);
    }
    catch {
        return null;
    }
    if (!Array.isArray(list) || list.length === 0)
        return null;
    const first = list[0];
    if (typeof first.number !== "number" || typeof first.title !== "string") {
        return null;
    }
    return { number: first.number, title: first.title };
}
//# sourceMappingURL=starter.js.map