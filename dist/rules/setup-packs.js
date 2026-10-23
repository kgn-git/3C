// The rule packs `setup` installs by default. One list, read by the setup step
// and asserted against `--help`, so the two cannot name different packs.
export const SETUP_RULE_PACKS = [
    "security/owasp-top-10",
    "security/cwe-top-25-2025",
    "quality/test-layering",
    "quality/file-size-and-comments",
    "ux/tone-and-manner",
];
//# sourceMappingURL=setup-packs.js.map