import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
async function exists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function detectFramework(workspaceDir) {
    // 1. package.json — JS/TS branch. Prefer vitest over jest when both are present.
    // Rationale: vitest is the more modern choice; if both are listed, the workspace
    // is likely migrating from jest, so the new tooling is what we should scaffold for.
    const pkgJson = await tryReadJson(join(workspaceDir, "package.json"));
    if (pkgJson !== null) {
        const deps = {
            ...(pkgJson.devDependencies ?? {}),
            ...(pkgJson.dependencies ?? {}),
        };
        if (typeof deps["vitest"] === "string") {
            return { framework: "vitest", source: "package.json" };
        }
        if (typeof deps["jest"] === "string") {
            return { framework: "jest", source: "package.json" };
        }
        // #78 AC1: Mocha — lowest JS precedence (legacy), after vitest/jest.
        if (typeof deps["mocha"] === "string") {
            return { framework: "mocha", source: "package.json" };
        }
    }
    // #78 AC2: Playwright — config-file presence (browser e2e is config-driven).
    if ((await exists(join(workspaceDir, "playwright.config.ts"))) ||
        (await exists(join(workspaceDir, "playwright.config.js")))) {
        return { framework: "playwright", source: "playwright.config" };
    }
    // 2. pyproject.toml — Python branch. Substring match is sufficient at L1:
    // `[tool.pytest.ini_options]` or `pytest = "..."` in any [tool.*] block.
    const pyproject = await tryReadText(join(workspaceDir, "pyproject.toml"));
    if (pyproject !== null) {
        if (pyproject.includes("[tool.pytest.ini_options]") ||
            /^\s*pytest\s*=/m.test(pyproject)) {
            return { framework: "pytest", source: "pyproject.toml" };
        }
    }
    // 3. requirements.txt — fallback Python branch.
    const requirements = await tryReadText(join(workspaceDir, "requirements.txt"));
    if (requirements !== null) {
        if (/^\s*pytest\b/m.test(requirements)) {
            return { framework: "pytest", source: "requirements.txt" };
        }
    }
    // #78 AC3: JUnit 5 — pom.xml or build.gradle declaring junit-jupiter.
    const pom = await tryReadText(join(workspaceDir, "pom.xml"));
    if (pom !== null && pom.includes("junit-jupiter")) {
        return { framework: "junit", source: "pom.xml" };
    }
    const gradle = await tryReadText(join(workspaceDir, "build.gradle"));
    if (gradle !== null && gradle.includes("junit-jupiter")) {
        return { framework: "junit", source: "build.gradle" };
    }
    return { framework: "unknown", source: null };
}
async function tryReadJson(path) {
    try {
        const raw = await readFile(path, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function tryReadText(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=detect-framework.js.map