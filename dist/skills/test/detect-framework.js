import { readFile } from "node:fs/promises";
import { join } from "node:path";
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