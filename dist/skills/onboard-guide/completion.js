// #22 AC5 / NFR-SEC-01 — completion is LOCAL-FIRST. Always write a local
// artifact (user + timestamp only — never any onboarding activity). An
// off-machine notification happens ONLY when the team explicitly configures
// `notifyCommand` AND a runner is supplied. No default network egress.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
async function notifyCommand(ws) {
    try {
        const raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "onboarding-guide.yaml"), "utf8"));
        const o = (raw && typeof raw === "object" ? raw : {});
        return typeof o.notifyCommand === "string" && o.notifyCommand !== ""
            ? o.notifyCommand
            : null;
    }
    catch {
        return null;
    }
}
export async function recordCompletion(ws, user, runner) {
    const dir = join(ws, `.${resolveBrandSlugSync()}`, "onboarding", "completions");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${user}.yaml`), yaml.dump({ user, completedAt: new Date().toISOString() }), "utf8");
    // Off-machine ONLY if explicitly configured AND a runner is provided.
    const cmd = await notifyCommand(ws);
    if (cmd && runner) {
        try {
            await runner(cmd);
        }
        catch {
            /* notification is best-effort — never blocks completion */
        }
    }
}
//# sourceMappingURL=completion.js.map