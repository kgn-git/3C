export type Framework = "jest" | "vitest" | "pytest" | "unknown";
export interface FrameworkResult {
    readonly framework: Framework;
    readonly source: "package.json" | "pyproject.toml" | "requirements.txt" | null;
}
export declare function detectFramework(workspaceDir: string): Promise<FrameworkResult>;
//# sourceMappingURL=detect-framework.d.ts.map