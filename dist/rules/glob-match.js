// Minimal glob-to-regex translator for L1 rule glob matching.
// Supports: **, *, ? as wildcards, and `{a,b}` brace sets (#464) whose
// alternatives may themselves hold wildcards, `/` or a nested set. A brace
// with no top-level comma (`{}`, `{a}`) or without its partner is literal, as
// in POSIX shells. Everything else is literal.
// Path separator: /. Backslashes are normalised to / before matching.
//
// The translator never throws: it is shared with the post-edit hook, whose
// never-throw catch would swallow a throw together with every other finding.
// Malformed braces are refused at LOAD time instead — see `braceProblem`.
const REGEX_META = /[.+^${}()|[\]\\]/g;
/**
 * One character a wildcard may match inside a path segment: anything but `/`
 * and a line terminator. #440 AC13: `[^/]` matched `\n`, `\r`, U+2028 and
 * U+2029, which bare `**` (`.`) never did — so `*`, `?` and `**\/` reached
 * across a line inside a segment, and for `suppress.ts` a glob that should
 * not have matched silenced a real finding (the fail-open direction).
 */
const SEGMENT_CHAR = "[^/\\n\\r\\u2028\\u2029]";
/** Characters allowed in one glob. */
export const MAX_GLOB_LENGTH = 200;
/** Brace groups allowed in one glob, nested groups included (#464). */
export const MAX_BRACE_GROUPS = 8;
/**
 * `**` occurrences allowed in one glob, counted in the raw text so every
 * brace alternative counts. Each compiles to a star group, and ambiguous star
 * groups make a FAILING match polynomial in path depth with the count as the
 * exponent. Measured on a 30-deep non-matching path (#464 board): `**\/` x4
 * 5ms, x5 36ms, x6 220ms, x8 10.1s — #430's old cap of 8 sat past the
 * post-edit hook's 12s timeout — and `{**\/,}` x8 took 42s.
 */
export const MAX_GLOBSTARS = 4;
/** What to tell an author whose glob `globProblem` refused. */
export const GLOB_REMEDIATION = `Balance every \`{\` with a \`}\` (e.g. \`**/*.{ts,js}\`), and keep a glob to ${MAX_GLOB_LENGTH} characters, ` +
    `${MAX_GLOBSTARS} \`**\` and ${MAX_BRACE_GROUPS} brace groups.`;
/**
 * Why a glob cannot be used, or null. Every loader of globs calls this, so a
 * malformed or pathological glob is refused when it is loaded — never matched
 * as literal text, and never left to hang a match (CWE-400/CWE-1333).
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
                    // #430 board r1 (security, measured): `(?:.*?/)*` is ambiguous —
                    // each iteration may consume any number of path segments, so a
                    // FAILING match explores 2^k partitions of the k slashes in the
                    // path. Measured with the old form: one `**/` against a 30-deep
                    // non-matching path took 8.9s (depth 20: 6ms), and matchAny retries
                    // every glob against every file. Once #384 arms the post-edit hook
                    // that is an editor hang on an ordinary `src/**/*.ts` glob over a
                    // deep vendored tree.
                    //
                    // `(?:[^/]*/)*` accepts the IDENTICAL language — any string that is
                    // empty or ends in `/` — but decomposes uniquely, so there is no
                    // backtracking. Fixed in the translator rather than by capping the
                    // glob, because nothing is dropped: a cap that discarded a glob
                    // would make its files match no layer and go silently unchecked,
                    // which is a fail-open, and this module is shared with four
                    // unrelated consumers.
                    pattern += `(?:${SEGMENT_CHAR}*/)*`;
                    i += 3;
                    // #440 AC11: a RUN of `**/` is one group. Adjacent groups are each
                    // unambiguous but mutually ambiguous — a k-segment prefix splits
                    // across n groups many ways, so a failing match costs path-depth to
                    // the power n. `(**/)+` and `**/` accept the same language (a
                    // tested claim: tests/rules/glob-equivalence.test.ts). LITERAL
                    // adjacency only: a brace between two groups (`{**/,}**/`) is not
                    // merged — the `**` cap bounds that case.
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
                    // `{x/**,y}/z`: distribute the following `/` into each alternative
                    // ((A|B)/ == (A/|B/)), so an alternative ending in `**` meets its
                    // `/` and becomes the zero-or-more-segments form, as `x/**/z` does.
                    if (glob[next] === "/") {
                        alternatives = alternatives.map((a) => a + "/");
                        next += 1;
                    }
                    pattern += "(?:" + alternatives.map(globSource).join("|") + ")";
                    i = next;
                    continue;
                }
            }
            // `{}`, `{a}` or an unpartnered `{`: literal, like a shell.
        }
        // Literal char: escape regex metacharacters.
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