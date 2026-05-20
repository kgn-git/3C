// #15 AC1 — deterministic onboarding roadmap sourced from local project
// signals (CLAUDE.md, .claude/rules, package scripts). No network.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
async function read(ws, rel) {
    try {
        return await readFile(join(ws, rel), "utf8");
    }
    catch {
        return "";
    }
}
export async function buildRoadmap(ws) {
    const claude = (await read(ws, "CLAUDE.md")) || (await read(ws, ".claude/CLAUDE.md"));
    const pkg = await read(ws, "package.json");
    let scripts = "";
    try {
        const j = JSON.parse(pkg);
        scripts = Object.keys(j.scripts ?? {}).join(", ");
    }
    catch {
        /* no package.json */
    }
    return [
        {
            id: "architecture",
            title: "Architecture overview",
            body: claude.trim() ||
                "Read CLAUDE.md and .claude/rules/ for the team's architecture conventions.",
        },
        {
            id: "key-files",
            title: "Key files & standards",
            body: "Standards live in .claude/rules/; project context in CLAUDE.md.",
        },
        {
            id: "workflows",
            title: "Core workflows",
            body: scripts
                ? `Project scripts: ${scripts}.`
                : "See CLAUDE.md for the team's core development workflows.",
        },
    ];
}
//# sourceMappingURL=roadmap.js.map