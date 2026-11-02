import { proseDate } from "../memory/brief-render.js";
import { readStore } from "../memory/store.js";
// What a handover must carry for the memory to learn from it, each matched where the template itself writes it, so a
// mention in a comment does not count.
const MEMORY_LINES = [/^## Lessons\s*$/m, /^## Decisions\s*$/m, /^verdict:.*\bby_category:/m, /^board_rounds:/m];
/** Whether an installed handover template lacks something the memory reads. */
export const lacksMemoryLines = (template) => MEMORY_LINES.some((line) => !line.test(template));
export const outdatedTemplateMessage = (slug) => `\`.github/ISSUE_TEMPLATE/handover.md\` lacks the Lessons and Decisions lines and the review fields the memory reads — run \`${slug} setup --replace\`, which overwrites the template, so copy out any edits you made first. This blocks nothing.`;
/** One line about the delivery memory. A missing memory is normal, so only an unreadable one warns. */
export async function memoryFinding(workspaceDir, slug) {
    const read = await readStore(workspaceDir);
    if (read.kind === "absent")
        return { level: "ok", check: "memory", message: `no memory yet (${slug} memory sync builds it).` };
    if (read.kind === "refused") {
        return { level: "warn", check: "memory", message: `the memory could not be read (${read.reason}) — run \`${slug} memory sync\` to build it again. This blocks nothing.` };
    }
    const n = read.store.notes.length;
    return { level: "ok", check: "memory", message: `synced ${proseDate(read.store.meta.syncedAt)}, ${n.toLocaleString("en-GB")} ${n === 1 ? "note" : "notes"}.` };
}
//# sourceMappingURL=doctor-memory.js.map