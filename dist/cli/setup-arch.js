// setup's architecture step: draft the boundary map from the code that is
// already there, so the gate and the post-edit hook check something from the
// first session. Structural only — layers are named by tier, because the
// pattern library holds no structural signature to match a codebase against;
// naming stays the architect agent's job. Offline: discovery reads tracked
// files through git, and nothing here dispatches an agent.
import { readFile } from "node:fs/promises";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { planArchDiscover, writeDiscoverPlan } from "../skills/arch-boundary/discover.js";
import { isUnmodifiedStarter } from "../skills/arch-boundary/scaffold.js";
import { archConfigPath } from "../validate/arch-config.js";
import { archCommand } from "./commands/arch.js";
const clean = (s) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, 500);
export async function setupArchStep(cwd, log) {
    const slug = resolveBrandSlugSync();
    const file = `.${slug}/architecture.yaml`;
    const inert = async (why, next) => {
        // A map already there, other than the unedited starter, is the adopter's:
        // it is kept, and nothing is said about the gate it may well be driving.
        const existing = await readFile(archConfigPath(cwd), "utf8").catch(() => null);
        if (existing !== null && !isUnmodifiedStarter(existing)) {
            log(`↪ architecture map not drafted: ${why}. ${file} is kept as you wrote it.`);
            return 0;
        }
        log(`↪ architecture map not drafted: ${why}. The commit gate and the post-edit hook check ` +
            `nothing until layers are defined; ${next}`);
        return archCommand(["init"], { cwd, log: () => { } }).then((code) => {
            if (code === 0)
                log(`  ${file} is the inert starter — define layers and deny pairs there by hand.`);
            return code;
        });
    };
    let plan;
    try {
        plan = await planArchDiscover(cwd);
    }
    catch (e) {
        const detail = clean(e.message);
        return /git ls-files failed|not a git repository/i.test(detail)
            ? inert("this is not a git repository with committed files, so there is no code to read", `run \`${slug} arch-check discover\` once there is.`)
            : inert(`the code could not be read (${detail})`, `run \`${slug} arch-check discover\` to retry.`);
    }
    // A map the adopter wrote is kept as it is: setup adds what is missing and
    // skips what exists. Discover is the route to compare it with a fresh draft.
    if (plan.proposed && plan.reason === "populated") {
        log(`↪ ${file} already declares layers — kept. Run \`${slug} arch-check discover\` to compare it with a draft from your code.`);
        return 0;
    }
    if (plan.reason === "notes") {
        log(`↪ ${file} holds your own notes — kept. Run \`${slug} arch-check discover\` to see a draft from your code.`);
        return 0;
    }
    if (plan.proposed) {
        if (plan.tiers < 2) {
            log(`↪ ${file} does not parse, so it was kept and the gate fails closed; fix it by hand (the code gives no draft to replace it with).`);
            return 0;
        }
        await writeDiscoverPlan(plan);
        log(`↪ ${file} does not parse, so it was kept and the gate fails closed; a draft from your code ` +
            `(${plan.tiers} layers) was written to .${slug}/architecture.proposed.yaml to replace it with.`);
        return 0;
    }
    if (plan.tiers === 0) {
        return inert("there is no tracked JS/TS source in sub-directories (other languages are not read yet)", `commit JS/TS source in sub-directories and run \`${slug} arch-check discover\`.`);
    }
    if (plan.tiers === 1) {
        return inert("the code forms one layer, so there is no direction to enforce yet", `once one directory imports another, run \`${slug} arch-check discover\`.`);
    }
    await writeDiscoverPlan(plan);
    log(`✓ drafted ${file} from your code: ${plan.tiers} layers. From now on an edit that reverses one ` +
        `of today's dependencies is refused, by the commit gate and the post-edit hook. Review the ` +
        `layers and rename them; \`/${slug}-review-board\` can help. To undo, delete the file and run ` +
        `\`${slug} arch-check init\`.`);
    return 0;
}
//# sourceMappingURL=setup-arch.js.map