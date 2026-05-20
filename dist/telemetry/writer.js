import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { telemetryFilePath } from "./path.js";
export async function writeTelemetryEvent(workspaceDir, event, cfg) {
    if (!cfg.enabled)
        return; // AC7: disabled ⇒ emit nothing
    const file = telemetryFilePath(workspaceDir, event.timestamp.slice(0, 10));
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify(event) + "\n", "utf8");
}
//# sourceMappingURL=writer.js.map