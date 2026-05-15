// Minimal glob-to-regex translator for L1 rule glob matching.
// Supports: **, *, ? as wildcards; everything else is literal.
// Path separator: /. Backslashes are normalised to / before matching.
const REGEX_META = /[.+^${}()|[\]\\]/g;
export function globToRegex(glob) {
    let pattern = "";
    let i = 0;
    while (i < glob.length) {
        const c = glob[i];
        if (c === "*") {
            if (glob[i + 1] === "*") {
                if (glob[i + 2] === "/") {
                    pattern += "(?:.*?/)*";
                    i += 3;
                    continue;
                }
                pattern += ".*";
                i += 2;
                continue;
            }
            pattern += "[^/]*";
            i += 1;
            continue;
        }
        if (c === "?") {
            pattern += "[^/]";
            i += 1;
            continue;
        }
        // Literal char: escape regex metacharacters.
        pattern += (c ?? "").replace(REGEX_META, "\\$&");
        i += 1;
    }
    return new RegExp("^" + pattern + "$");
}
export function matchAny(globs, files) {
    if (globs.length === 0 || files.length === 0)
        return false;
    const regexes = globs.map(globToRegex);
    for (const file of files) {
        const normalised = file.replaceAll("\\", "/");
        for (const re of regexes) {
            if (re.test(normalised))
                return true;
        }
    }
    return false;
}
//# sourceMappingURL=glob-match.js.map