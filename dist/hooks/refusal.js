// Which hook commands are refused, and what is said. A hook is refused one at a time by the orchestrator, never by
// the config loader: a config error bypasses the whole hook chain, so one bad line would switch every hook off.
import { NETWORK_IDENTIFIER_TYPES, scanSecrets } from "../validate/secrets.js";
const ROUTE = "a hook cannot carry a secret in its command, so the script it runs must read its own secret, for example from the OS credential store";
/**
 * Why a hook command may not run, or null when it may. The credential itself is never printed, only its kind, and
 * an address or a host name is not a credential. `slug` is the product's folder name, where the file to edit lives.
 */
export function hookRefusal(command, slug) {
    const file = `.${slug}/hooks.yaml`;
    const reasons = [];
    if (command.includes("${OS_KEYCHAIN:")) {
        reasons.push(`\${OS_KEYCHAIN:...} references in hook commands are retired — remove it from ${file}; a hook that needs a secret must read its own secret from the OS credential store`);
    }
    const kinds = [...new Set(scanSecrets(command).hits.map((hit) => hit.type))].filter((type) => !NETWORK_IDENTIFIER_TYPES.has(type));
    if (kinds.length > 0)
        reasons.push(`the command holds a literal credential (${kinds.join(", ")}) — remove it from ${file}; ${ROUTE}`);
    return reasons.length === 0 ? null : reasons.join("; and ");
}
/** A hook's id as it is printed: an id that holds a credential is withheld, because the id is also free text. */
export function hookLabel(id) {
    return scanSecrets(id).hits.some((hit) => !NETWORK_IDENTIFIER_TYPES.has(hit.type)) ? "(name withheld)" : id;
}
/** Why a hook's matcher cannot be used, or null when it can. Building it can throw, and a throw in the orchestrator would deny commits with no hook named. */
export function matcherFault(matcher, slug) {
    try {
        new RegExp(matcher);
        return null;
    }
    catch {
        return `the matcher is not a valid pattern — fix it in .${slug}/hooks.yaml`;
    }
}
/** Whether a hook is to run for a tool call. A hook whose matcher cannot be built counts as matching, so it is refused by name instead of throwing. */
export function matchesTool(matcher, toolName) {
    try {
        return new RegExp(matcher).test(toolName);
    }
    catch {
        return true;
    }
}
//# sourceMappingURL=refusal.js.map