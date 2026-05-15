// Single-use emergency bypass token.
// `recordBypass` writes both:
//   - .${BRAND_SLUG}/state/bypass.next  (consumed by orchestrator on next hook run)
//   - .${BRAND_SLUG}/logs/hooks/bypasses-<date>.jsonl  (audit trail; never deleted)
// `consumeBypassToken` reads and deletes the token (single-use, AC7).
// AD-16: ${BRAND_SLUG} is resolved at runtime via resolveBrandSlugSync().
import { mkdir, readFile, rm, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export async function recordBypass(workspaceDir, request) {
    const slug = resolveBrandSlugSync();
    const stateDir = join(workspaceDir, `.${slug}`, "state");
    const logDir = join(workspaceDir, `.${slug}`, "logs", "hooks");
    await mkdir(stateDir, { recursive: true });
    await mkdir(logDir, { recursive: true });
    const token = {
        schema_version: 1,
        reason: request.reason,
        user: request.user,
        timestamp: new Date().toISOString(),
    };
    const tokenPath = join(stateDir, "bypass.next");
    await writeFile(tokenPath, JSON.stringify(token) + "\n", "utf8");
    const date = token.timestamp.slice(0, 10);
    const logPath = join(logDir, `bypasses-${date}.jsonl`);
    await appendFile(logPath, JSON.stringify(token) + "\n", "utf8");
    return { path: tokenPath };
}
export async function consumeBypassToken(workspaceDir) {
    const slug = resolveBrandSlugSync();
    const tokenPath = join(workspaceDir, `.${slug}`, "state", "bypass.next");
    let raw;
    try {
        raw = await readFile(tokenPath, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT")
            return null;
        throw err;
    }
    // Always delete the token, even if parsing fails — single-use semantics.
    try {
        await rm(tokenPath, { force: true });
    }
    catch {
        // ignore — file may already be gone in race
    }
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" ||
            parsed === null ||
            typeof parsed.reason !== "string" ||
            typeof parsed.user !== "string") {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=bypass.js.map