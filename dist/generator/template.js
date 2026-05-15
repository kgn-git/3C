import { substitute } from "../branding/substitute.js";
import { ARCHITECTURE, SECURITY_FRAMEWORK, SECURITY_TOOLING, TEST_FRAMEWORK, TEST_METHODOLOGY, findOption, } from "../wizard/options.js";
const NO_RULE_OPTION_IDS = new Set([
    "convention-driven",
    "no-methodology",
    "skip",
    "none",
    "other",
]);
const PLACEHOLDERS = {
    ARCHITECTURE_RULES: { category: ARCHITECTURE, ids: (s) => [s.architecture] },
    TEST_METHODOLOGY_RULES: {
        category: TEST_METHODOLOGY,
        ids: (s) => [s.testMethodology],
    },
    TEST_FRAMEWORK_RULES: {
        category: TEST_FRAMEWORK,
        ids: (s) => [s.testFramework],
    },
    SECURITY_FRAMEWORK_RULES: {
        category: SECURITY_FRAMEWORK,
        ids: (s) => [...s.securityFrameworks],
    },
    SECURITY_TOOLING_RULES: {
        category: SECURITY_TOOLING,
        ids: (s) => [...s.securityTooling],
    },
};
export function renderTemplate(input) {
    let output = input.baseTemplate;
    // 1. Replace fragment placeholders for each section.
    for (const [placeholder, { category, ids }] of Object.entries(PLACEHOLDERS)) {
        const sectionText = renderSection(category, ids(input.selections), input.fragments);
        const placeholderComment = `<!-- ${placeholder} -->`;
        output = output.replace(placeholderComment, sectionText);
    }
    // 2. Substitute provenance tokens.
    output = output
        .replaceAll("${GENERATED_AT}", input.provenance.generatedAt)
        .replaceAll("${INPUT_HASH}", input.provenance.inputHash);
    // 3. Substitute brand tokens (FRAMEWORK_* and BRAND_*).
    output = substitute(output, input.brand);
    return output;
}
function renderSection(category, selectedIds, fragments) {
    const blocks = [];
    let sawNoRuleOption = false;
    for (const id of selectedIds) {
        const option = findOption(category, id);
        if (!option)
            continue;
        if (NO_RULE_OPTION_IDS.has(option.id)) {
            sawNoRuleOption = true;
            continue;
        }
        const fragmentKey = `${category.id}/${option.id}`;
        const fragment = fragments.get(fragmentKey);
        if (fragment !== undefined) {
            blocks.push(fragment.trimEnd());
        }
        else {
            blocks.push(defaultFragment(option));
        }
    }
    if (blocks.length === 0 && sawNoRuleOption) {
        return `<!-- No formal ${category.label.toLowerCase()} chosen; the team follows surrounding-codebase conventions. -->`;
    }
    return blocks.join("\n\n");
}
function defaultFragment(option) {
    const lines = [`The team uses **${option.label}**.`];
    if (option.source) {
        const ref = option.source.url ? `[${option.source.name}](${option.source.url})` : option.source.name;
        lines.push("");
        lines.push(`> Source: ${ref}${option.source.year ? ` (${option.source.year})` : ""}.`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=template.js.map