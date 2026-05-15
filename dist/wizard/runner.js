import { checkbox, select } from "@inquirer/prompts";
import { ARCHITECTURE, LANGUAGE, PROJECT_TYPE, SECURITY_FRAMEWORK, SECURITY_TOOLING, TEST_FRAMEWORK, TEST_METHODOLOGY, } from "./options.js";
const DEFAULT_PROMPTER = {
    select: ({ message, choices }) => select({
        message,
        choices: choices.map((c) => ({ value: c.value, name: c.name, description: c.description })),
    }),
    checkbox: ({ message, choices }) => checkbox({
        message,
        choices: choices.map((c) => ({
            value: c.value,
            name: c.name,
            description: c.description,
            checked: c.checked,
        })),
    }),
};
export const DEFAULT_SELECTIONS = {
    projectType: "library",
    language: "typescript",
    architecture: "convention-driven",
    testMethodology: "test-pyramid",
    testFramework: "vitest",
    securityFrameworks: ["owasp-top-10-2025"],
    securityTooling: [],
};
export const INTERACTIVE_FOOTER_WARNING = "Note: your selections become part of Claude Code's instructions. Do not enter secrets, hostnames, or content you would not commit to git.";
export async function runWizard(opts = {}) {
    if (opts.nonInteractive) {
        return DEFAULT_SELECTIONS;
    }
    const prompter = opts.prompter ?? DEFAULT_PROMPTER;
    // AC11: print prompt-injection / secret hygiene reminder before capturing input.
    if (opts.notice) {
        opts.notice(INTERACTIVE_FOOTER_WARNING);
    }
    else {
        console.error(INTERACTIVE_FOOTER_WARNING);
    }
    const projectType = await prompter.select({
        message: "Project type:",
        choices: toSelectChoices(PROJECT_TYPE),
    });
    const language = await prompter.select({
        message: "Primary language:",
        choices: toSelectChoices(LANGUAGE),
    });
    const architecture = await prompter.select({
        message: "Architectural style:",
        choices: toSelectChoices(ARCHITECTURE),
    });
    const testMethodology = await prompter.select({
        message: "Test methodology:",
        choices: toSelectChoices(TEST_METHODOLOGY),
    });
    const testFramework = await prompter.select({
        message: "Test framework:",
        choices: toSelectChoices(TEST_FRAMEWORK),
    });
    const securityFrameworks = await prompter.checkbox({
        message: "Security baseline (multi-select):",
        choices: toCheckboxChoices(SECURITY_FRAMEWORK, ["owasp-top-10-2025"]),
    });
    const securityTooling = await prompter.checkbox({
        message: "Security tooling (multi-select):",
        choices: toCheckboxChoices(SECURITY_TOOLING),
    });
    return {
        projectType,
        language,
        architecture,
        testMethodology,
        testFramework,
        securityFrameworks,
        securityTooling,
    };
}
function toSelectChoices(category) {
    return category.options.map((o) => ({
        value: o.id,
        name: o.label,
        description: o.description,
    }));
}
function toCheckboxChoices(category, defaultsChecked = []) {
    return category.options.map((o) => ({
        value: o.id,
        name: o.label,
        description: o.description,
        checked: defaultsChecked.includes(o.id),
    }));
}
//# sourceMappingURL=runner.js.map