// The hook-telemetry path and schema are owned by `src/telemetry/`; this
// writes to that canonical path `.${slug}/telemetry/hooks/<date>.jsonl`
// (schema_version:1). The orchestrator emits via `src/telemetry/writer.ts`
// directly, not through this.
import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { telemetryFilePath } from "../telemetry/path.js";
export async function appendHookEvent(workspaceDir, record) {
    const file = telemetryFilePath(workspaceDir, record.timestamp.slice(0, 10));
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify(record) + "\n", "utf8");
}
//# sourceMappingURL=event-log.js.map