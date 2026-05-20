import { readFile } from "node:fs/promises";
import { basename, extname, resolve, sep, posix } from "node:path";
const EXPORT_FN_PATTERN = /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm;
const COMMONJS_FN_PATTERN = /^\s*function\s+([A-Za-z_$][\w$]*)/gm;
const PY_DEF_PATTERN = /^\s*def\s+([a-zA-Z_]\w*)\s*\(/gm;
export async function scaffoldTest(opts) {
    // AC9: path-traversal guard — resolve sourcePath and reject anything outside workspaceDir.
    const wsRoot = resolve(opts.workspaceDir);
    const sourceAbs = resolve(wsRoot, opts.sourcePath);
    if (!sourceAbs.startsWith(wsRoot + sep) && sourceAbs !== wsRoot) {
        return { ok: false, error: `path escapes workspace: ${opts.sourcePath}` };
    }
    let sourceText;
    try {
        sourceText = await readFile(sourceAbs, "utf8");
    }
    catch {
        return { ok: false, error: `source file not found: ${opts.sourcePath}` };
    }
    const symbols = extractSymbols(sourceText, opts.framework);
    const warnings = [];
    if (symbols.length === 0) {
        warnings.push("no exported symbols detected; scaffold contains a placeholder describe block. Edit before running.");
    }
    const branches = countBranches(sourceText);
    // Heuristic: each exported function gets one test in the scaffold.
    // Warn if branches > symbols × 1 (rough proxy — real coverage is L2 #17).
    if (branches > symbols.length && symbols.length > 0) {
        warnings.push(`source has ~${branches} branches (if/else/switch/ternary) but scaffold ` +
            `generates only ${symbols.length} test case(s). Add cases per branch for L1 soft coverage.`);
    }
    if (opts.framework === "pytest" && (opts.sourcePath.includes("/") || opts.sourcePath.includes(sep))) {
        warnings.push("pytest import line uses basename only; for nested paths like pkg/util.py, " +
            "manually adjust the import to: from pkg.util import ...");
    }
    const content = opts.mode === "integration"
        ? renderIntegration(opts.framework, opts.sourcePath, opts.extraSources ?? [])
        : renderScaffold(opts.framework, opts.sourcePath, symbols);
    const suggestedTargetPath = suggestTargetPath(opts.framework, opts.sourcePath);
    return { ok: true, content, suggestedTargetPath, warnings };
}
function extractSymbols(source, framework) {
    const names = new Set();
    const patterns = framework === "pytest"
        ? [PY_DEF_PATTERN]
        : [EXPORT_FN_PATTERN, COMMONJS_FN_PATTERN];
    for (const pat of patterns) {
        for (const match of source.matchAll(pat)) {
            const name = match[1];
            if (name !== undefined)
                names.add(name);
        }
    }
    return Array.from(names);
}
function countBranches(source) {
    // Coarse, regex-based — counts if/case/ternary. Good enough for AC3 soft hint.
    // Note: `else if` is already counted by the `if (` pattern; don't double-count.
    const ifCount = (source.match(/\bif\s*\(/g) ?? []).length;
    const caseCount = (source.match(/\bcase\s+/g) ?? []).length;
    const ternaryCount = (source.match(/[^?]\?[^?:]+:/g) ?? []).length;
    return ifCount + caseCount + ternaryCount;
}
function renderScaffold(framework, sourcePath, symbols) {
    switch (framework) {
        case "jest":
            return renderJest(sourcePath, symbols);
        case "vitest":
            return renderVitest(sourcePath, symbols);
        case "pytest":
            return renderPytest(sourcePath, symbols);
        case "mocha":
            return renderMocha(sourcePath, symbols);
        case "playwright":
            return renderPlaywright(sourcePath, symbols);
        case "junit":
            return renderJUnit(sourcePath, symbols);
    }
}
function renderMocha(sourcePath, symbols) {
    const importPath = "./" + basename(sourcePath, extname(sourcePath));
    const names = symbols.length > 0 ? `{ ${symbols.join(", ")} }` : "{ /* exports */ }";
    const blocks = (symbols.length > 0 ? symbols : ["placeholder"])
        .map((n) => [
        `  describe("${n}", function () {`,
        `    it("does the expected thing", function () {`,
        `      // TODO: arrange + act + assert`,
        `      assert.ok(${n});`,
        `    });`,
        `  });`,
    ].join("\n"))
        .join("\n\n");
    return [
        'const assert = require("node:assert");',
        `const ${names} = require("${importPath}");`,
        "",
        `describe("${basename(sourcePath)}", function () {`,
        blocks,
        `});`,
        "",
    ].join("\n");
}
function renderPlaywright(sourcePath, symbols) {
    const importPath = "./" + basename(sourcePath, extname(sourcePath));
    const names = symbols.length > 0 ? symbols.join(", ") : "/* exports */";
    const blocks = (symbols.length > 0 ? symbols : ["placeholder"])
        .map((n) => [
        `test("${n}", async ({ page }) => {`,
        `  // TODO: drive the page, then assert`,
        `  expect(${n}).toBeDefined();`,
        `});`,
    ].join("\n"))
        .join("\n\n");
    return [
        'import { test, expect } from "@playwright/test";',
        `import { ${names} } from "${importPath}";`,
        "",
        blocks,
        "",
    ].join("\n");
}
function renderJUnit(sourcePath, symbols) {
    const className = basename(sourcePath, extname(sourcePath));
    const methods = (symbols.length > 0 ? symbols : ["placeholder"])
        .map((n) => [
        `    @Test`,
        `    void ${n}DoesTheExpectedThing() {`,
        `        // TODO: arrange + act + assert`,
        `        assertNotNull(new ${className}());`,
        `    }`,
    ].join("\n"))
        .join("\n\n");
    return [
        "import org.junit.jupiter.api.Test;",
        "import static org.junit.jupiter.api.Assertions.*;",
        "",
        `class ${className}Test {`,
        methods,
        `}`,
        "",
    ].join("\n");
}
// #78 AC6: integration scaffold — multiple subjects + a test-double seam.
function renderIntegration(framework, sourcePath, extraSources) {
    const all = [sourcePath, ...extraSources];
    const subjects = all.map((s) => basename(s, extname(s)));
    if (framework === "pytest") {
        return [
            "# Integration test — exercises multiple modules together.",
            ...all.map((s) => `# subject: ${s.replaceAll("\\", "/")}`),
            "",
            "def test_integration_placeholder():",
            "    # TODO: wire real collaborators; replace fakes with team test doubles",
            "    fake_dependency = None  # test double / stub / fixture",
            "    assert fake_dependency is None",
            "",
        ].join("\n");
    }
    if (framework === "junit") {
        return [
            "import org.junit.jupiter.api.Test;",
            "import static org.junit.jupiter.api.Assertions.*;",
            "",
            `// Integration test across: ${subjects.join(", ")}`,
            "class IntegrationTest {",
            "    @Test",
            "    void modulesInteractCorrectly() {",
            "        // TODO: real collaborators; replace stub with a team test double",
            "        Object stub = null; // test double / mock / fixture",
            "        assertNull(stub);",
            "    }",
            "}",
            "",
        ].join("\n");
    }
    const isPlaywright = framework === "playwright";
    const header = isPlaywright
        ? 'import { test, expect } from "@playwright/test";'
        : framework === "vitest"
            ? 'import { describe, it, expect } from "vitest";'
            : framework === "jest" || framework === "mocha"
                ? 'const assert = require("node:assert");'
                : "";
    const imports = all
        .map((s) => `// integration subject: ${s.replaceAll("\\", "/")} → ./${basename(s, extname(s))}`)
        .join("\n");
    return [
        header,
        imports,
        "",
        `describe("integration: ${subjects.join(" + ")}", () => {`,
        `  it("modules interact correctly", ${isPlaywright ? "async ({ page }) " : "()"}=> {`,
        "    // TODO: wire real collaborators across the modules above.",
        "    const testDouble = undefined; // replace with a team mock / stub / fixture",
        "    expect(testDouble).toBeUndefined();",
        "  });",
        "});",
        "",
    ].join("\n");
}
function renderVitest(sourcePath, symbols) {
    const importPath = "./" + basename(sourcePath, extname(sourcePath));
    const importNames = symbols.length > 0 ? symbols.join(", ") : "/* exported symbols */";
    const blocks = (symbols.length > 0 ? symbols : ["placeholder"]).map((name) => [
        `describe("${name}", () => {`,
        `  it("does the expected thing", () => {`,
        `    // TODO: arrange + act + assert`,
        `    expect(${name}).toBeDefined();`,
        `  });`,
        `});`,
    ].join("\n")).join("\n\n");
    return [
        'import { describe, it, expect } from "vitest";',
        `import { ${importNames} } from "${importPath}";`,
        "",
        blocks,
        "",
    ].join("\n");
}
function renderJest(sourcePath, symbols) {
    const importPath = "./" + basename(sourcePath, extname(sourcePath));
    const importNames = symbols.length > 0 ? `{ ${symbols.join(", ")} }` : "{ /* exported symbols */ }";
    const blocks = (symbols.length > 0 ? symbols : ["placeholder"]).map((name) => [
        `describe("${name}", () => {`,
        `  it("does the expected thing", () => {`,
        `    // TODO: arrange + act + assert`,
        `    expect(${name}).toBeDefined();`,
        `  });`,
        `});`,
    ].join("\n")).join("\n\n");
    return [
        `const ${importNames} = require("${importPath}");`,
        "",
        blocks,
        "",
    ].join("\n");
}
function renderPytest(sourcePath, symbols) {
    const moduleName = basename(sourcePath, extname(sourcePath));
    const importNames = symbols.length > 0 ? symbols.join(", ") : "/* TODO */";
    const importLine = symbols.length > 0
        ? `from ${moduleName} import ${importNames}`
        : `# from ${moduleName} import ...`;
    const blocks = (symbols.length > 0 ? symbols : ["placeholder"]).map((name) => [
        `def test_${name}():`,
        `    # TODO: arrange + act + assert`,
        symbols.length > 0
            ? `    assert ${name} is not None`
            : `    assert True`,
    ].join("\n")).join("\n\n\n");
    return [
        importLine,
        "",
        "",
        blocks,
        "",
    ].join("\n");
}
function suggestTargetPath(framework, sourcePath) {
    const ext = extname(sourcePath);
    const base = basename(sourcePath, ext);
    const normalised = sourcePath.replaceAll(sep, "/");
    const dir = normalised.includes("/")
        ? posix.dirname(normalised)
        : ".";
    if (framework === "pytest") {
        return posix.join(dir, `test_${base}.py`);
    }
    return posix.join(dir, `${base}.test${ext}`);
}
//# sourceMappingURL=scaffold.js.map