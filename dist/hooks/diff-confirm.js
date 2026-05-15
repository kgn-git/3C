// AC8 (security): the SeA-mandatory mitigation for the hooks.yaml-trust gap.
// When .${BRAND_SLUG}/hooks.yaml content changes since the developer's last session,
// this prompts the developer with a unified diff and requires explicit `Y`
// confirmation before any hook from the new chain runs. Confirmations and
// rejections are appended to the JSONL audit log.
// AD-16: ${BRAND_SLUG} is resolved at runtime via resolveBrandSlugSync().
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { createPatch } from "diff";
import { resolveBrandSlugSync } from "../branding/runtime.js";
const hashPath = (slug) => [`.${slug}`, "state", "hooks-yaml-hash"];
const cachePath = (slug) => [`.${slug}`, "state", "hooks-yaml.cache"];
const logDir = (slug) => [`.${slug}`, "logs", "hooks"];
export function hashContent(content) {
    return createHash("sha256").update(content).digest("hex");
}
export async function checkAndConfirmHooksConfig(opts) {
    const slug = resolveBrandSlugSync();
    const currentHash = hashContent(opts.currentContent);
    const storedHash = await readStored(join(opts.workspaceDir, ...hashPath(slug)));
    if (storedHash !== null && storedHash.trim() === currentHash) {
        return { action: "no-change" };
    }
    const previousContent = storedHash !== null
        ? (await readStored(join(opts.workspaceDir, ...cachePath(slug)))) ?? ""
        : "";
    const diff = createPatch(`.${slug}/hooks.yaml`, previousContent, opts.currentContent, "previous", "current");
    const accepted = await opts.prompter(diff);
    await logDecision(opts.workspaceDir, {
        decision: accepted ? "confirmed" : "rejected",
        user: opts.user,
        previous_hash: storedHash?.trim() ?? null,
        current_hash: currentHash,
    });
    if (!accepted) {
        return { action: "rejected" };
    }
    await persistState(opts.workspaceDir, currentHash, opts.currentContent);
    return { action: "confirmed" };
}
async function readStored(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT")
            return null;
        throw err;
    }
}
async function persistState(workspaceDir, hash, content) {
    const slug = resolveBrandSlugSync();
    const stateDir = join(workspaceDir, `.${slug}`, "state");
    await mkdir(stateDir, { recursive: true });
    await writeFile(join(workspaceDir, ...hashPath(slug)), hash + "\n", "utf8");
    await writeFile(join(workspaceDir, ...cachePath(slug)), content, "utf8");
}
async function logDecision(workspaceDir, entry) {
    const slug = resolveBrandSlugSync();
    const dir = join(workspaceDir, ...logDir(slug));
    await mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString();
    const path = join(dir, `config-changes-${timestamp.slice(0, 10)}.jsonl`);
    const record = {
        schema_version: 1,
        timestamp,
        ...entry,
    };
    await appendFile(path, JSON.stringify(record) + "\n", "utf8");
}
//# sourceMappingURL=diff-confirm.js.map