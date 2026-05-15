// Reads .claude/rules/**/*.md (recursive) and returns parsed RuleFile entries.
// Malformed files yield collected LoadErrors and are excluded from rules — never throws on ENOENT; other readdir errors propagate.
import { readFile, readdir } from "node:fs/promises";
import { join, posix } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
export async function loadRules(rulesDir) {
    const rules = [];
    const errors = [];
    async function walk(currentDir, relativePrefix) {
        let entries;
        try {
            entries = await readdir(currentDir, { withFileTypes: true });
        }
        catch (err) {
            if (err.code === "ENOENT")
                return;
            throw err;
        }
        for (const entry of entries) {
            if (entry.name.startsWith("."))
                continue;
            const fullPath = join(currentDir, entry.name);
            const relPath = relativePrefix === "" ? entry.name : posix.join(relativePrefix, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath, relPath);
                continue;
            }
            if (!entry.isFile())
                continue;
            if (!entry.name.endsWith(".md"))
                continue;
            const content = await readFile(fullPath, "utf8");
            const parsed = parseFrontmatter(content);
            if (!parsed.ok) {
                errors.push({
                    path: fullPath,
                    line: parsed.error.line,
                    message: parsed.error.message,
                });
                continue;
            }
            rules.push({
                path: fullPath,
                filename: relPath,
                fields: parsed.value.fields,
                body: parsed.value.body,
                bodyStartLine: parsed.value.bodyStartLine,
            });
        }
    }
    await walk(rulesDir, "");
    return { rules, errors };
}
//# sourceMappingURL=loader.js.map