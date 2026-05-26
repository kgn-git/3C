// #241 (VP-06-F05): read-only discoverability of installed skills and agents.
// Skills are user-invoked slash commands; agents are dispatched workers (Task
// tool / auto-selection) — never slash-invoked. These listers feed
// `3c skills list` / `3c agents list` and the "Skills vs Agents" docs.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
function parseFrontmatter(text) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!m)
        return null;
    try {
        const doc = yaml.load(m[1] ?? "");
        return doc && typeof doc === "object" ? doc : null;
    }
    catch {
        return null;
    }
}
const str = (v, fallback = "") => typeof v === "string" ? v : fallback;
export async function listInstalledAgents(workspaceDir) {
    const dir = join(workspaceDir, ".claude", "agents");
    let files;
    try {
        files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
    }
    catch {
        return [];
    }
    const out = [];
    for (const f of files) {
        const fm = parseFrontmatter(await readFile(join(dir, f), "utf8"));
        if (!fm)
            continue;
        out.push({
            name: str(fm.name, f.replace(/\.md$/, "")),
            tools: Array.isArray(fm.tools) ? fm.tools.map((t) => String(t)) : [],
            model: str(fm.model),
            description: str(fm.description),
        });
    }
    return out;
}
export async function listInstalledSkills(workspaceDir) {
    const dir = join(workspaceDir, ".claude", "skills");
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const dirs = entries
        .filter((e) => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));
    const out = [];
    for (const e of dirs) {
        let text;
        try {
            text = await readFile(join(dir, e.name, "SKILL.md"), "utf8");
        }
        catch {
            continue;
        }
        const fm = parseFrontmatter(text);
        if (!fm)
            continue;
        out.push({
            name: str(fm.name, e.name),
            description: str(fm.description),
            modelInvocable: fm["disable-model-invocation"] !== true,
        });
    }
    return out;
}
//# sourceMappingURL=listing.js.map