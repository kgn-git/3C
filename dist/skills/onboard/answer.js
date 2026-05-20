// #15 AC4 / NFR-SEC-01 — answer from LOCAL sources only (rule bodies +
// CLAUDE.md + docs/*.md). Simple keyword match; no network, no model call.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadRules } from "../../rules/loader.js";
async function safeRead(p) {
    try {
        return await readFile(p, "utf8");
    }
    catch {
        return "";
    }
}
export async function answerFromSources(ws, query) {
    const q = query.trim().toLowerCase();
    if (q === "")
        return "No local answer (empty query).";
    const sources = [];
    const { rules } = await loadRules(join(ws, ".claude", "rules"));
    for (const r of rules) {
        // Match the rule's topic (filename + description) as well as its body,
        // so "naming" surfaces the naming standard, not just literal occurrences.
        const topic = `${r.filename} ${String(r.fields.description ?? "")}`;
        sources.push({ name: r.filename, text: `${topic}\n${r.body}` });
    }
    sources.push({ name: "CLAUDE.md", text: await safeRead(join(ws, "CLAUDE.md")) });
    sources.push({
        name: ".claude/CLAUDE.md",
        text: await safeRead(join(ws, ".claude", "CLAUDE.md")),
    });
    try {
        for (const f of await readdir(join(ws, "docs"))) {
            if (f.endsWith(".md")) {
                sources.push({
                    name: `docs/${f}`,
                    text: await safeRead(join(ws, "docs", f)),
                });
            }
        }
    }
    catch {
        /* no docs dir */
    }
    for (const s of sources) {
        const idx = s.text.toLowerCase().indexOf(q);
        if (idx >= 0) {
            const snippet = s.text.slice(Math.max(0, idx - 40), idx + 160).trim();
            return `From ${s.name}:\n${snippet}`;
        }
    }
    return `No local answer found for "${query}" in standards or docs.`;
}
//# sourceMappingURL=answer.js.map