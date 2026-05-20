import { readFile } from "node:fs/promises";
import { telemetryFilePath } from "./path.js";
import { isTelemetryEvent } from "./record.js";
const DAY_MS = 86_400_000;
// AC3/AC4: reads ONLY this workspace's own JSONL day-files within the
// window. No remote/team source — a missing day file is just skipped.
export async function readEventsInWindow(workspaceDir, days, now = new Date()) {
    const out = [];
    for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * DAY_MS)
            .toISOString()
            .slice(0, 10);
        let content;
        try {
            content = await readFile(telemetryFilePath(workspaceDir, date), "utf8");
        }
        catch {
            continue;
        }
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed === "")
                continue;
            try {
                const parsed = JSON.parse(trimmed);
                if (isTelemetryEvent(parsed))
                    out.push(parsed);
            }
            catch {
                /* skip malformed */
            }
        }
    }
    return out;
}
//# sourceMappingURL=read.js.map