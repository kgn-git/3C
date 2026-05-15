// Append-only JSONL log of hook executions. Per AC12, every record
// carries `schema_version: 1` so L2's #20 Hook Telemetry can consume
// the format without a migration.
// AD-16: log directory is namespaced via .${BRAND_SLUG}/logs/hooks/
// where ${BRAND_SLUG} is resolved at runtime via resolveBrandSlugSync().
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export async function appendHookEvent(workspaceDir, record) {
    const slug = resolveBrandSlugSync();
    const dir = join(workspaceDir, `.${slug}`, "logs", "hooks");
    await mkdir(dir, { recursive: true });
    const date = record.timestamp.slice(0, 10);
    const path = join(dir, `${date}.jsonl`);
    await appendFile(path, JSON.stringify(record) + "\n", "utf8");
}
//# sourceMappingURL=event-log.js.map