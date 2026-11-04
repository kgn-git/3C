import { gitIn } from "../../memory/git-probe.js";
import { promptFor } from "../../memory/prompts.js";
import { readUsableStore, refusalLines } from "../../memory/store-gate.js";
import { NO_STORE_LINE } from "../../memory/brief-render.js";
/**
 * `3c memory brief <issue> --prompt`: the prompt that starts the work on an issue. It is built from the number alone,
 * so it reads no issue and no GitHub; it refuses what the brief refuses about the memory, and it prints no prompt when
 * there is no usable memory.
 */
export async function promptCommand(issue, env) {
    const used = await readUsableStore(env.cwd, env.git ?? gitIn(env.cwd), env.limits);
    if (used.kind === "absent") {
        env.error(NO_STORE_LINE);
        return 1;
    }
    if (used.kind === "refused") {
        for (const line of refusalLines("Memory brief", used.refusal))
            env.error(line);
        return 1;
    }
    env.log(promptFor("deliver", issue));
    return 0;
}
//# sourceMappingURL=memory-prompt.js.map