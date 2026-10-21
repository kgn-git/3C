// Regex-based secret-leakage scan per AC10 of issue #1.
// Pragmatic L1 scope: AWS access keys, GitHub PATs (classic + fine-grained),
// JWT tokens, RFC1918 private IPs, public IPs, internal hostnames.
// An IP-shaped run that is immediately followed by `-<alphanumeric>` is part of
// a longer hyphenated identifier — a version string, not an address. Four-segment
// Linux kernel releases (`6.6.114.1-microsoft-standard-WSL2`) are IP-shaped, which
// made `3c bug` flag its own captured environment as a leaked public IP and refuse
// to file on every Linux host. Scoped deliberately to the hyphen-suffix case: a
// genuine address followed by ordinary prose ("8.8.8.8 - resolver") still matches.
const VERSION_SUFFIX = /(?!-[A-Za-z0-9])/.source;
const RFC1918_PATTERN = new RegExp(/\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/
    .source + VERSION_SUFFIX, "g");
const ANY_IP_PATTERN = new RegExp(/\b(?:\d{1,3}\.){3}\d{1,3}\b/.source + VERSION_SUFFIX, "g");
const DETECTORS = [
    { type: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
    { type: "github-pat", pattern: /\bghp_[A-Za-z0-9]{36}\b/g },
    { type: "github-pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g },
    {
        type: "jwt",
        pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\b/g,
    },
    {
        type: "internal-hostname",
        // #413: a name followed by a file extension is a FILENAME
        // (`CLAUDE.local.md`, `settings.local.json`) and one followed by `(` is a
        // CALL (`threading.local()`), not a host. Only a KNOWN extension excludes:
        // any other dotted continuation is a qualified host (`svc.internal.acme.com`)
        // and still matches, as do `db.internal:5432` and `printer.local`.
        pattern: /\b[a-zA-Z0-9][a-zA-Z0-9-]*\.(?:internal|corp|local)\b(?!\.(?:md|mdx|markdown|json5?|jsonc|ya?ml|toml|ini|cfg|conf|env|txt|log|lock|xml|html?|s?css|[cm]?[jt]sx?|py|rb|go|rs|java|kt|sh|ps1|bat|cmd|bak|tmp)\b|\()/g,
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
        pattern: /\b(?:postgresql|postgres|mongodb\+srv|mongodb|mysql|redis):\/\/[^\s/]*:[^\s/@]+@[^\s/]+/g,
    },
];
/** The four octets of a dotted-quad match, or null when any is above 255 (#413 AC2). */
function octets(ip) {
    const parts = ip.split(".").map(Number);
    return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}
/**
 * Addresses that identify nothing (#413 AC1): loopback 127/8, `0.0.0.0`, the
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
function redact(value) {
    if (value.length <= 4)
        return "***";
    return `${value.slice(0, 4)}…${"*".repeat(Math.min(8, value.length - 4))}`;
}
export function scanSecrets(text) {
    const hits = [];
    for (const { type, pattern } of DETECTORS) {
        for (const match of text.matchAll(pattern)) {
            hits.push({ type, match: match[0], redacted: redact(match[0]), index: match.index });
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
            redacted: redact(match[0]),
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
            redacted: redact(match[0]),
            index: match.index,
        });
    }
    return { hits };
}
//# sourceMappingURL=secrets.js.map