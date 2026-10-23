// Glob-to-regex for rule globs: `**`, `*`, `?` and `{a,b}` sets (nestable). A
// brace with no top-level comma or no partner is literal, as in POSIX shells.
//
// The translator never throws: the post-edit hook's catch would swallow a
// throw with every other finding. Bad globs are refused at load (`globProblem`).
const REGEX_META = /[.+^${}()|[\]\\]/g;
/**
 * Excludes line terminators as `.` does: otherwise a wildcard crosses a line,
 * and in `suppress.ts` an over-matching glob silences a real finding.
 */
const SEGMENT_CHAR = "[^/\\n\\r\\u2028\\u2029]";
export const MAX_GLOB_LENGTH = 200;
/** Nested groups included. */
export const MAX_BRACE_GROUPS = 8;
/**
 * Counted in the raw text, so every brace alternative counts. A failing match
 * is polynomial in path depth with this as the exponent: on a 30-deep path
 * `**\/` x6 took 220ms, x8 10.1s, `{**\/,}` x8 42s (hook timeout: 12s).
 */
export const MAX_GLOBSTARS = 4;
/** What to tell an author whose glob `globProblem` refused. */
export const GLOB_REMEDIATION = `Balance every \`{\` with a \`}\` (e.g. \`**/*.{ts,js}\`), and keep a glob to ${MAX_GLOB_LENGTH} characters, ` +
    `${MAX_GLOBSTARS} \`**\` and ${MAX_BRACE_GROUPS} brace groups.`;
/**
 * Why a glob cannot be used, or null. Loaders call this so a malformed or
 * pathological glob is refused, not matched literally or left to hang a match
 * (CWE-400/CWE-1333).
 */
export function globProblem(glob) {
    if (glob.length > MAX_GLOB_LENGTH)
        return `is ${glob.length} characters (limit ${MAX_GLOB_LENGTH})`;
    const globstars = (glob.match(/\*\*/g) ?? []).length;
    if (globstars > MAX_GLOBSTARS)
        return `has ${globstars} '**' (limit ${MAX_GLOBSTARS})`;
    let depth = 0;
    let groups = 0;
    for (const c of glob) {
        if (c === "{") {
            depth++;
            groups++;
        }
        else if (c === "}") {
            if (depth === 0)
                return "has a '}' with no matching '{'";
            depth--;
        }
    }
    if (depth !== 0)
        return "has a '{' with no matching '}'";
    if (groups > MAX_BRACE_GROUPS)
        return `has ${groups} brace groups (limit ${MAX_BRACE_GROUPS})`;
    return null;
}
/** The index of the `}` closing the `{` at `open`, or -1. */
function closingBrace(glob, open) {
    let depth = 0;
    for (let j = open; j < glob.length; j++) {
        if (glob[j] === "{")
            depth++;
        else if (glob[j] === "}" && --depth === 0)
            return j;
    }
    return -1;
}
/** `body` split on its top-level commas (commas inside nested braces stay put). */
function topLevelAlternatives(body) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let j = 0; j < body.length; j++) {
        const c = body[j];
        if (c === "{")
            depth++;
        else if (c === "}")
            depth--;
        else if (c === "," && depth === 0) {
            parts.push(body.slice(start, j));
            start = j + 1;
        }
    }
    parts.push(body.slice(start));
    return parts;
}
export function globToRegex(glob) {
    return new RegExp("^" + globSource(glob) + "$");
}
// An alternation is emitted, never a string product of the expansions: the
// regex stays linear in the glob's length however the sets combine.
function globSource(glob) {
    let pattern = "";
    let i = 0;
    while (i < glob.length) {
        const c = glob[i];
        if (c === "*") {
            if (glob[i + 1] === "*") {
                if (glob[i + 2] === "/") {
                    // Not `(?:.*?/)*`: it is ambiguous, so a failing match explores
                    // 2^k splits of the path's k slashes (8.9s at depth 30). This form
                    // accepts the same language but decomposes uniquely. Capping globs
                    // instead would leave dropped globs' files unchecked (fail-open).
                    pattern += `(?:${SEGMENT_CHAR}*/)*`;
                    i += 3;
                    // A run of `**/` is one group: adjacent groups are mutually
                    // ambiguous (cost: depth^n), and `(**/)+` equals `**/`
                    // (tests/rules/glob-equivalence.test.ts). `{**/,}**/` is not
                    // merged; MAX_GLOBSTARS bounds it.
                    while (glob.startsWith("**/", i))
                        i += 3;
                    continue;
                }
                pattern += ".*";
                i += 2;
                continue;
            }
            pattern += `${SEGMENT_CHAR}*`;
            i += 1;
            continue;
        }
        if (c === "?") {
            pattern += SEGMENT_CHAR;
            i += 1;
            continue;
        }
        if (c === "{") {
            const close = closingBrace(glob, i);
            if (close !== -1) {
                let alternatives = topLevelAlternatives(glob.slice(i + 1, close));
                if (alternatives.length > 1) {
                    let next = close + 1;
                    // Distribute a following `/` so an alternative ending in `**` gets
                    // the zero-or-more-segments form, as in `x/**/z`.
                    if (glob[next] === "/") {
                        alternatives = alternatives.map((a) => a + "/");
                        next += 1;
                    }
                    pattern += "(?:" + alternatives.map(globSource).join("|") + ")";
                    i = next;
                    continue;
                }
            }
        }
        pattern += (c ?? "").replace(REGEX_META, "\\$&");
        i += 1;
    }
    return pattern;
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