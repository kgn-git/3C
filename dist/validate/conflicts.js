// Curated syntactic conflict detection per AC4 of issue #1.
// L1 scope: ~30 keyword pairs across common decision axes.
// Semantic conflict detection (e.g. NLI on contradictory rules) deferred to VP-01-F05 (L2).
const PAIRS = [
    { category: "indentation", pair: ["tabs", "spaces"] },
    { category: "indentation", pair: ["2-space", "4-space"] },
    { category: "punctuation", pair: ["semicolons", "no semicolons"] },
    { category: "punctuation", pair: ["semicolons", "no-semicolons"] },
    { category: "quoting", pair: ["single quotes", "double quotes"] },
    { category: "naming", pair: ["camelCase", "snake_case"] },
    { category: "naming", pair: ["camelCase", "kebab-case"] },
    { category: "naming", pair: ["snake_case", "kebab-case"] },
    { category: "test-framework", pair: ["mocha", "jest"] },
    { category: "test-framework", pair: ["mocha", "vitest"] },
    { category: "test-framework", pair: ["jest", "vitest"] },
    { category: "package-manager", pair: ["yarn", "pnpm"] },
    { category: "package-manager", pair: ["npm", "pnpm"] },
    { category: "linter", pair: ["eslint", "biome"] },
    { category: "linter", pair: ["eslint", "tslint"] },
    { category: "linter", pair: ["eslint", "oxlint"] },
    { category: "formatter", pair: ["prettier", "biome"] },
    { category: "formatter", pair: ["prettier", "rome"] },
    { category: "bundler", pair: ["webpack", "vite"] },
    { category: "bundler", pair: ["webpack", "rollup"] },
    { category: "bundler", pair: ["webpack", "esbuild"] },
    { category: "bundler", pair: ["vite", "rollup"] },
    { category: "module-format", pair: ["esm", "commonjs"] },
    { category: "module-format", pair: ["esm", "cjs"] },
];
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wordBoundaryRegex(keyword) {
    // Use \b at word boundaries that are still meaningful around the keyword.
    // For multi-word keywords ("single quotes"), \b at start and end works.
    return new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
}
export function scanConflicts(text) {
    const seen = new Set();
    const conflicts = [];
    for (const { category, pair } of PAIRS) {
        if (wordBoundaryRegex(pair[0]).test(text) &&
            wordBoundaryRegex(pair[1]).test(text)) {
            const key = `${category}:${pair[0]}|${pair[1]}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            conflicts.push({ category, pair });
        }
    }
    return { conflicts };
}
//# sourceMappingURL=conflicts.js.map