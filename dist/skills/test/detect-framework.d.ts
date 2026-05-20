export type Framework = "jest" | "vitest" | "pytest" | "mocha" | "playwright" | "junit" | "unknown";
export interface FrameworkResult {
    readonly framework: Framework;
    readonly source: "package.json" | "pyproject.toml" | "requirements.txt" | "playwright.config" | "pom.xml" | "build.gradle" | null;
}
export declare function detectFramework(workspaceDir: string): Promise<FrameworkResult>;
//# sourceMappingURL=detect-framework.d.ts.map