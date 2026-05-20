import { join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export function telemetryDir(workspaceDir) {
    return join(workspaceDir, `.${resolveBrandSlugSync()}`, "telemetry", "hooks");
}
export function telemetryFilePath(workspaceDir, isoDate) {
    return join(telemetryDir(workspaceDir), `${isoDate}.jsonl`);
}
//# sourceMappingURL=path.js.map