// Back-compat shim. The canonical hook-telemetry path + schema is owned by
// `src/telemetry/` (issue #20). `appendHookEvent` is retained with its L1
// signature for any caller not yet migrated; it now writes to the reconciled
// canonical path `.${slug}/telemetry/hooks/<date>.jsonl` (schema_version:1,
// no format migration — BRS/TRS §6.8 AC1). The orchestrator no longer calls
// this — it emits via `src/telemetry/writer.ts` directly.
import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { telemetryFilePath } from "../telemetry/path.js";
export async function appendHookEvent(workspaceDir, record) {
    const file = telemetryFilePath(workspaceDir, record.timestamp.slice(0, 10));
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify(record) + "\n", "utf8");
}
//# sourceMappingURL=event-log.js.map