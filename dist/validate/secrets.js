// Regex-based secret-leakage scan per AC10 of issue #1.
// Pragmatic L1 scope: AWS access keys, GitHub PATs (classic + fine-grained),
// JWT tokens, RFC1918 private IPs, public IPs, internal hostnames.
const RFC1918_PATTERN = /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g;
const ANY_IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
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
        pattern: /\b[a-zA-Z0-9][a-zA-Z0-9-]*\.(?:internal|corp|local)\b/g,
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
function redact(value) {
    if (value.length <= 4)
        return "***";
    return `${value.slice(0, 4)}…${"*".repeat(Math.min(8, value.length - 4))}`;
}
export function scanSecrets(text) {
    const hits = [];
    for (const { type, pattern } of DETECTORS) {
        for (const match of text.matchAll(pattern)) {
            hits.push({ type, match: match[0], redacted: redact(match[0]) });
        }
    }
    // IP detection: classify each as private (RFC1918) or public.
    const privateIps = new Set();
    for (const match of text.matchAll(RFC1918_PATTERN)) {
        privateIps.add(match[0]);
        hits.push({
            type: "private-ip",
            match: match[0],
            redacted: redact(match[0]),
        });
    }
    for (const match of text.matchAll(ANY_IP_PATTERN)) {
        if (privateIps.has(match[0]))
            continue;
        hits.push({
            type: "public-ip",
            match: match[0],
            redacted: redact(match[0]),
        });
    }
    return { hits };
}
//# sourceMappingURL=secrets.js.map