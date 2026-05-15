// Validates a parsed RuleFile against the L1 frontmatter contract,
// the AC7 body line cap, and the AC6 secret-pattern reject.
import { scanSecrets } from "../validate/secrets.js";
const BODY_LINE_CAP = 50;
export function validateRule(rule) {
    const diagnostics = [];
    // --- Frontmatter shape ------------------------------------------------
    const schemaVersion = rule.fields.schema_version;
    if (schemaVersion === undefined) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: 'missing required frontmatter field "schema_version"',
            remediation: "Add `schema_version: 1` to the rule frontmatter.",
        });
    }
    else if (schemaVersion !== 1) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: `unsupported schema_version: ${JSON.stringify(schemaVersion)} (expected integer 1)`,
            remediation: "Set `schema_version: 1` — only schema 1 is supported at L1.",
        });
    }
    const description = rule.fields.description;
    if (description === undefined) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: 'missing required frontmatter field "description"',
            remediation: "Add a `description: <string>` field describing the rule's purpose.",
        });
    }
    else if (typeof description !== "string") {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: `frontmatter "description" must be a string (got ${typeOf(description)})`,
        });
    }
    const globs = rule.fields.globs;
    if (globs === undefined) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: 'missing required frontmatter field "globs"',
            remediation: 'Add `globs: ["<pattern>"]` listing which file patterns this rule applies to.',
        });
    }
    else if (!Array.isArray(globs)) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: `frontmatter "globs" must be an array of strings (got ${typeOf(globs)})`,
        });
    }
    else if (globs.length === 0) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: 'frontmatter "globs" must contain at least one pattern',
        });
    }
    const priority = rule.fields.priority;
    if (priority !== undefined && !Number.isInteger(priority)) {
        diagnostics.push({
            path: rule.path,
            line: 1,
            severity: "error",
            message: `frontmatter "priority" must be an integer when present (got ${typeOf(priority)})`,
        });
    }
    // --- AC6: secret-pattern reject ---------------------------------------
    const secretScan = scanSecrets(rule.body);
    for (const hit of secretScan.hits) {
        diagnostics.push({
            path: rule.path,
            line: lineOfMatch(rule.body, hit.match, rule.bodyStartLine),
            severity: "error",
            message: `secret pattern detected (${hit.type}): ${hit.redacted}`,
            remediation: "Rule files MUST NOT contain credentials (NFR-SEC-06). Remove the value or replace with a placeholder.",
        });
    }
    // --- AC7: body line cap (warning only) --------------------------------
    if (nonBlankLineCount(rule.body) > BODY_LINE_CAP) {
        diagnostics.push({
            path: rule.path,
            line: rule.bodyStartLine,
            severity: "warning",
            message: `rule body exceeds ${BODY_LINE_CAP} non-blank lines; consider splitting or progressive disclosure`,
        });
    }
    const valid = diagnostics.every((d) => d.severity !== "error");
    return { valid, diagnostics };
}
function typeOf(v) {
    if (Array.isArray(v))
        return "array";
    return typeof v;
}
function lineOfMatch(body, match, bodyStartLine) {
    const idx = body.indexOf(match);
    if (idx === -1)
        return bodyStartLine;
    const before = body.slice(0, idx);
    const newlines = before.match(/\n/g);
    const offset = newlines ? newlines.length : 0;
    return bodyStartLine + offset;
}
function nonBlankLineCount(body) {
    let count = 0;
    for (const line of body.split("\n")) {
        if (line.trim() !== "")
            count++;
    }
    return count;
}
//# sourceMappingURL=validator.js.map