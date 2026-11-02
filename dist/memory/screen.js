import { scanSecrets } from "../validate/secrets.js";
/** The secret-pattern types found in any of the given forms of one text, sorted. */
export function secretTypesIn(...forms) {
    const types = new Set();
    for (const form of forms)
        for (const hit of scanSecrets(form).hits)
            types.add(hit.type);
    return [...types].sort();
}
//# sourceMappingURL=screen.js.map