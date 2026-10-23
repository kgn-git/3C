// NFR-SEC-01: completion is LOCAL only — user + timestamp, never activity.
// No notify hook: it would run a command named in workspace config.
import * as yaml from "js-yaml";
import { writeOnboardingFile } from "./user-path.js";
export async function recordCompletion(ws, user) {
    // The shared builder enforces name allow-list, containment, link refusal.
    await writeOnboardingFile(ws, user, yaml.dump({ user, completedAt: new Date().toISOString() }), "completions");
}
//# sourceMappingURL=completion.js.map