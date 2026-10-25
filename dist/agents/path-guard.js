// Registration-time PreToolUse policy for the L1 starter subagents.
// Returns an allow/deny decision for a (agent, tool, path) triple.
//
// Neither agent may Edit or Write: test-author returns a test body and
// /3c-test writes it through `test write`. Both are denied Read on .env*,
// ~/.ssh/, ~/.aws/. This module also holds the secret matchers the runtime
// PreToolUse hook uses: `isSecretPath` for a file, which both guards apply to
// Read, and `namesSecretPath` for a search path or glob, which only the hook
// applies (this policy judges one path per call).
import { posix } from "node:path";
import { globProblem, globToRegex } from "../rules/glob-match.js";
// Case-insensitive, and matched on the name NTFS would open: a component's
// stream (`.env::$DATA`) and trailing dots and spaces are ignored there.
const SECRET_PATTERNS = [
    /(^|[\\/:])\.env[^\\/]*$/i,
    /(^|[\\/:])\.ssh[\\/]/i,
    /(^|[\\/:])\.aws[\\/]/i,
];
// A search path or glob names a folder or a pattern, not one file, so it is
// matched loosely: any segment that starts a secret name, a wildcard or brace
// set included (`.env*`, `{.env,x}`, `~/.ssh`).
const SECRET_SEARCH_PATTERNS = [
    /(^|[\\/:*{},])\.env/i,
    /(^|[\\/:*{},])\.ssh([\\/*{},]|$)/i,
    /(^|[\\/:*{},])\.aws([\\/*{},]|$)/i,
];
/** Forward slashes, dot segments resolved; `//` (UNC) collapses to one root. */
const normal = (p) => posix.normalize(p.replace(/\\/g, "/"));
const asWindowsOpens = (p) => p
    .split("/")
    .map((s, i) => {
    if (s === "." || s === "..")
        return s;
    // A leading drive (`C:`, or drive-relative `C:.env`) is kept; the rest is cleaned.
    const drive = i === 0 ? (/^[A-Za-z]:/.exec(s)?.[0] ?? "") : "";
    return drive + s.slice(drive.length).replace(/:.*$/, "").replace(/[. ]+$/, "");
})
    .join("/");
/** The path as written, with its dot segments resolved, and as Windows would open it. */
const spellings = (p) => [p, normal(p), asWindowsOpens(normal(p))];
// A Windows 8.3 alias (`ENV~1`, `SSH~1.PUB`) opens the long name it stands
// for, which no text match can see, so any segment shaped like one counts.
const SHORT_NAME = /(^|\/)[^/~]{1,8}~\d+(\.[^/.]{0,3})?(\/|$)/;
const hasShortName = (p) => SHORT_NAME.test(normal(p));
/** True when a file path names a protected secret, however it is spelled. */
export function isSecretPath(path) {
    return hasShortName(path) || spellings(path).some((c) => SECRET_PATTERNS.some((r) => r.test(c)));
}
// The secret paths a wildcard glob is tried against when it names none as
// text (`?env`, `**/credentials`, `*/*/id_rsa`).
const SECRET_TAILS = [".env", ".env.local", ".ssh/id_rsa", ".ssh/id_ed25519", ".ssh/config", ".aws/credentials", ".aws/config"];
const SECRET_NAMES = [...new Set(SECRET_TAILS.map((t) => posix.basename(t)))];
/**
 * True when the glob matches a secret tail at some depth it can reach. Each
 * glob segment can consume at most one folder (a `**` any number, which the
 * shallowest sample already shows), so trying every depth up to the segment
 * count covers a fixed-depth glob such as `*\/*\/*\/*\/id_rsa`. The samples
 * carry no literal prefix, so a wildcard folder behind one (`src/**\/id_rsa`)
 * is judged apart: it can stand for `.ssh` or `.aws`, and the last segment
 * alone decides.
 */
function reachesSecretSample(glob) {
    if (nameBehindWildcardFolder(glob, false))
        return true;
    const re = new RegExp(globToRegex(normal(glob)).source, "i");
    const depth = glob.split("/").length;
    for (let d = 0; d <= depth; d++) {
        if (SECRET_TAILS.some((t) => re.test("a/".repeat(d) + t)))
            return true;
    }
    return false;
}
/** True when a folder segment holds a wildcard and the last segment, read as a glob, can be a secret file's name. */
function nameBehindWildcardFolder(glob, literalOnly) {
    const segments = normal(glob).split("/");
    const last = segments.pop() ?? "";
    if (!segments.some((s) => /[*?{]/.test(s)))
        return false;
    // A last segment of wildcards alone (`**\/*`) is a plain listing; the Glob
    // tool returns names, so only a segment that spells part of a name counts.
    if (literalOnly && !/[^*?{},]/.test(last))
        return false;
    if (globProblem(last) !== null)
        return true;
    const name = new RegExp(globToRegex(last).source, "i");
    return SECRET_NAMES.some((n) => name.test(n));
}
/** True when a search path or glob would reach a protected secret. */
export function namesSecretPath(pathOrGlob) {
    // A bracket set can spell any character, and a glob the translator refuses
    // cannot be judged, so both are refused rather than guessed at.
    if (/[[\]]/.test(pathOrGlob) || (/[*?{}]/.test(pathOrGlob) && globProblem(pathOrGlob) !== null))
        return true;
    if (hasShortName(pathOrGlob) || spellings(pathOrGlob).some((c) => SECRET_SEARCH_PATTERNS.some((r) => r.test(c))))
        return true;
    if (pathOrGlob.includes("?"))
        return reachesSecretSample(pathOrGlob);
    return nameBehindWildcardFolder(pathOrGlob, true);
}
/**
 * True when a glob field would reach a protected secret. In a glob a
 * backslash escapes the next character (`.\env` is `.env` to ripgrep), so it
 * spells a name no text match sees; a path field keeps it as a separator.
 */
export function namesSecretGlob(glob) {
    return glob.includes("\\") || namesSecretPath(glob);
}
// The extensions a content glob may end in (`*.ts`): code, docs and data a
// review reads. An allow-list, because the names an env file can take after
// `.env` (`.env.staging2`) are open-ended.
const CONTENT_EXTENSIONS = new Set([
    "ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs", "json", "md", "mdx", "txt",
    "py", "go", "rs", "java", "kt", "rb", "php", "cs", "c", "h", "cpp", "hpp", "swift",
    "css", "scss", "html", "vue", "svelte", "astro", "sql", "sh", "yml", "yaml", "toml", "xml", "svg",
]);
/**
 * True when a glob that selects which files' content is returned could match
 * a secret. The last segment is judged by its shape: allowed only when it
 * starts with a literal character other than a dot (no `.env…` name can match
 * it), or is `*.<ext>` / `*.{a,b}` with every extension on the content
 * allow-list. So `*`, `*nv`, `.e*` and `*.production` count and `*.ts` does
 * not; an env file named with an allowed extension (`.env.json`) is the
 * accepted residual. A secret's file name (`credentials`) counts wherever
 * it could be read as one. A negating `!` or a space (which some tools split on)
 * cannot be judged as one plain inclusion, so it counts too. The search root
 * itself is judged by `insideProject` in src/cli/hook-path-guard.ts.
 */
export function contentGlobReachesSecret(glob) {
    if (namesSecretGlob(glob) || /^\s*!|\s/.test(glob))
        return true;
    // A brace set that spans folders (`{src/*.ts,.e*}`, nested or not) puts an
    // alternative in the last segment that splitting on `/` would not see. Read
    // from the raw glob: normalising first can fold `x/..` away.
    if (slashInsideBraces(glob) || commaOutsideBraces(glob))
        return true;
    const segments = glob.split("/");
    const last = segments.pop() ?? "";
    // A folder segment that starts with a dot and holds a wildcard (`.s*/`) can
    // stand for `.ssh` or `.aws`; and a wildcard anywhere can carry a literal
    // last segment into one (`**/credentials`), so the whole glob is tried too.
    if (segments.some((s) => s.startsWith(".") && /[*?{]/.test(s)))
        return true;
    if (/[*?{]/.test(glob) && reachesSecretSample(glob))
        return true;
    // ripgrep matches a glob with no slash against the file name at any depth,
    // so `credentials` alone selects `.aws/credentials`.
    if (segments.length === 0 && nameBehindWildcardFolder(`**/${glob}`, false))
        return true;
    if (/^[^.*?{[\\]/.test(last))
        return false;
    const ext = /^\*\.(?:([A-Za-z0-9]+)|\{([A-Za-z0-9]+(?:,[A-Za-z0-9]+)*)\})$/.exec(last);
    if (ext === null)
        return true;
    return (ext[1] ?? ext[2]).split(",").some((e) => !CONTENT_EXTENSIONS.has(e.toLowerCase()));
}
/** True when a `,` sits outside every brace set, where a tool may read it as a second pattern. */
function commaOutsideBraces(glob) {
    let depth = 0;
    for (const c of glob) {
        if (c === "{")
            depth++;
        else if (c === "}")
            depth = Math.max(0, depth - 1);
        else if (c === "," && depth === 0)
            return true;
    }
    return false;
}
/** True when a `/` sits inside a brace set at any depth; a backslash was refused before this runs. */
function slashInsideBraces(glob) {
    let depth = 0;
    for (const c of glob) {
        if (c === "{")
            depth++;
        else if (c === "}")
            depth = Math.max(0, depth - 1);
        else if (c === "/" && depth > 0)
            return true;
    }
    return false;
}
/**
 * True when a search root names a protected secret as text. A root is a
 * literal folder, so brackets in it are plain characters (`app/[id]`).
 */
export function namesSecretRoot(root) {
    return hasShortName(root) || spellings(root).some((c) => SECRET_SEARCH_PATTERNS.some((r) => r.test(c)));
}
const AGENT_TOOL_ALLOWLIST = {
    "code-reviewer": new Set(["Read", "Grep", "Glob"]),
    "test-author": new Set(["Read", "Grep", "Glob"]),
};
export function enforceAgentPathPolicy(event) {
    const allowed = Object.hasOwn(AGENT_TOOL_ALLOWLIST, event.agent) ? AGENT_TOOL_ALLOWLIST[event.agent] : undefined;
    if (!allowed) {
        return { allow: false, reason: `unknown/unregistered agent: ${event.agent}` };
    }
    if (!allowed.has(event.tool)) {
        return {
            allow: false,
            reason: `tool ${event.tool} not in allowlist for ${event.agent} (read-only / scoped per registration)`,
        };
    }
    if (event.tool === "Read" && isSecretPath(event.path)) {
        return {
            allow: false,
            reason: `Read denied on protected secret-path: ${event.path}`,
        };
    }
    return { allow: true };
}
//# sourceMappingURL=path-guard.js.map