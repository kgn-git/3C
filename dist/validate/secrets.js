// Regex-based secret-leakage scan.
// Pragmatic scope: credentials with a fixed prefix or shape, and the addresses
// and hostnames that identify a machine.
// An IP-shaped run that is immediately followed by `-<alphanumeric>` is part of
// a longer hyphenated identifier — a version string, not an address. Four-segment
// Linux kernel releases (`6.6.114.1-microsoft-standard-WSL2`) are IP-shaped.
// Scoped deliberately to the hyphen-suffix case: a genuine address followed by
// ordinary prose ("8.8.8.8 - resolver") still matches.
const VERSION_SUFFIX = /(?!-[A-Za-z0-9])/.source;
const RFC1918_PATTERN = new RegExp(/\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/
    .source + VERSION_SUFFIX, "g");
const ANY_IP_PATTERN = new RegExp(/\b(?:\d{1,3}\.){3}\d{1,3}\b/.source + VERSION_SUFFIX, "g");
// A pattern that restarts at every hyphen and scans to the end of the run is quadratic on a long run of hyphenated
// letters, which anyone can paste into an issue. The hostname and JWT detectors name their run, so a failed attempt
// skips the rest of it, and the connection string walks its @-separated parts once.
export const DETECTORS = [
    { type: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
    { type: "github-pat", pattern: /\bghp_[A-Za-z0-9]{36}\b/g },
    { type: "github-pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
    {
        type: "jwt",
        pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\b/g,
        run: { starts: /\beyJ/, chars: /[A-Za-z0-9_-]*/ },
    },
    {
        type: "internal-hostname",
        // A name followed by a file extension is a FILENAME
        // (`CLAUDE.local.md`, `settings.local.json`) and one followed by `(` is a
        // CALL (`threading.local()`), not a host. Only a KNOWN extension excludes:
        // any other dotted continuation is a qualified host (`svc.internal.acme.com`)
        // and still matches, as do `db.internal:5432` and `printer.local`.
        pattern: /\b[a-zA-Z0-9][a-zA-Z0-9-]*\.(?:internal|corp|local)\b(?!\.(?:md|mdx|markdown|json5?|jsonc|ya?ml|toml|ini|cfg|conf|env|txt|log|lock|xml|html?|s?css|[cm]?[jt]sx?|py|rb|go|rs|java|kt|sh|ps1|bat|cmd|bak|tmp)\b|\()/g,
        run: { starts: /\b[a-zA-Z0-9]/, chars: /[a-zA-Z0-9-]*/ },
    },
    {
        type: "stripe-key",
        pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
    },
    { type: "stripe-key", pattern: /\bwhsec_[A-Za-z0-9]{24,}\b/g },
    {
        type: "pem-block",
        pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g,
    },
    {
        type: "db-connection-string",
        pattern: /\b(?:postgresql|postgres|mongodb\+srv|mongodb|mysql|redis):\/\/(?:[^\s/@]*@)*[^\s/@:]*:[^\s/@]+@[^\s/]+/g,
    },
    { type: "github-app-token", pattern: /\bgh[ousr]_[A-Za-z0-9]{36,255}\b/g },
    { type: "ai-api-key", pattern: /\bsk-(?:proj|ant|svcacct|admin|None)-[A-Za-z0-9_-]{32,}/g },
    { type: "ai-api-key", pattern: /\bsk-[A-Za-z0-9]{48}\b/g },
    { type: "slack-token", pattern: /\b(?:xox[abprs]|xapp)-[A-Za-z0-9-]{20,}/g },
    { type: "google-api-key", pattern: /\bAIza[A-Za-z0-9_-]{35}/g },
    {
        type: "bearer-token",
        // A reference to a variable or a placeholder starts with a character outside the value's class, so it is not
        // matched. A value that another detector reports is left to that detector (see withoutShadowedBearer).
        pattern: /\bBearer [A-Za-z0-9._~+/=-]{20,}/g,
    },
];
/** The four octets of a dotted-quad match, or null when any is above 255. */
function octets(ip) {
    const parts = ip.split(".").map(Number);
    return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}
/**
 * Addresses that identify nothing: loopback 127/8, `0.0.0.0`, the
 * limited broadcast, and the RFC 5737 documentation blocks — what docs and
 * examples are written with.
 */
function isNonIdentifyingAddress([a, b, c, d]) {
    if (a === 127)
        return true;
    if (a === 0 && b === 0 && c === 0 && d === 0)
        return true;
    if (a === 255 && b === 255 && c === 255 && d === 255)
        return true;
    if (a === 192 && b === 0 && c === 2)
        return true;
    if (a === 198 && b === 51 && c === 100)
        return true;
    if (a === 203 && b === 0 && c === 113)
        return true;
    return false;
}
export function redactMatch(value) {
    if (value.length <= 4)
        return "***";
    return `${value.slice(0, 4)}…${"*".repeat(Math.min(8, value.length - 4))}`;
}
/** The matches of one detector, as `matchAll` would report them. */
function* matchesOf({ pattern, run }, text) {
    if (run === undefined) {
        for (const match of text.matchAll(pattern))
            yield { text: match[0], index: match.index };
        return;
    }
    const attempt = new RegExp(pattern.source, "y");
    const starts = new RegExp(run.starts.source, "g");
    const chars = new RegExp(run.chars.source, "y");
    let from = 0;
    while (from <= text.length) {
        starts.lastIndex = from;
        const start = starts.exec(text);
        if (start === null)
            return;
        attempt.lastIndex = start.index;
        const match = attempt.exec(text);
        if (match !== null) {
            yield { text: match[0], index: start.index };
            from = start.index + match[0].length;
            continue;
        }
        chars.lastIndex = start.index;
        chars.exec(text);
        from = Math.max(chars.lastIndex, start.index + 1);
    }
}
const BEARER_WORD = "Bearer ";
// Types that say where something is or how it is sent, not which credential it is, and the Google key, which is
// reported at a lower severity than a Bearer token and so must not stand in for one.
const NEVER_SHADOWS_BEARER = new Set([
    "private-ip",
    "public-ip",
    "internal-hostname",
    "bearer-token",
    "google-api-key",
]);
/**
 * A Bearer hit whose whole value another credential detector also reports (`Bearer ghs_...`, `Bearer eyJ...`) is one
 * credential, so it is reported once, under the more specific type. A value the other detector covers only in part
 * keeps both hits, so no tail goes unreported.
 */
function withoutShadowedBearer(hits) {
    const endAt = new Map();
    for (const hit of hits) {
        if (NEVER_SHADOWS_BEARER.has(hit.type))
            continue;
        endAt.set(hit.index, Math.max(endAt.get(hit.index) ?? 0, hit.index + hit.match.length));
    }
    return hits.filter((hit) => {
        if (hit.type !== "bearer-token")
            return true;
        const ownerEnd = endAt.get(hit.index + BEARER_WORD.length);
        return ownerEnd === undefined || ownerEnd < hit.index + hit.match.length;
    });
}
export function scanSecrets(text) {
    const hits = [];
    for (const detector of DETECTORS) {
        for (const match of matchesOf(detector, text)) {
            hits.push({ type: detector.type, match: match.text, redacted: redactMatch(match.text), index: match.index });
        }
    }
    // IP detection: classify each as private (RFC1918) or public. Only a real
    // address (every octet ≤ 255) that identifies something is reported.
    const privateIps = new Set();
    for (const match of text.matchAll(RFC1918_PATTERN)) {
        if (octets(match[0]) === null)
            continue;
        privateIps.add(match[0]);
        hits.push({
            type: "private-ip",
            match: match[0],
            redacted: redactMatch(match[0]),
            index: match.index,
        });
    }
    for (const match of text.matchAll(ANY_IP_PATTERN)) {
        if (privateIps.has(match[0]))
            continue;
        const quad = octets(match[0]);
        if (quad === null || isNonIdentifyingAddress(quad))
            continue;
        hits.push({
            type: "public-ip",
            match: match[0],
            redacted: redactMatch(match[0]),
            index: match.index,
        });
    }
    return { hits: withoutShadowedBearer(hits) };
}
// Network-identifier detectors misfire on SVG coordinates and `.local` filenames, and an address is not a credential,
// so the gates that block on a credential leave these out. Typed as SecretType so a rename above fails the build
// instead of silently re-classing a type.
export const NETWORK_IDENTIFIER_TYPES = new Set(["public-ip", "private-ip", "internal-hostname"]);
//# sourceMappingURL=secrets.js.map