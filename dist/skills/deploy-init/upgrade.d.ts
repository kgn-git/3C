import { type GitRunner } from "./verify-commit.js";
export type FsReader = (path: string) => Promise<string>;
export type FsWriter = (path: string, content: string) => Promise<void>;
export interface UpgradeOptions {
    readonly newUpstreamRef: string;
    readonly newFrameworkVersion: string;
    readonly cwd: string;
    readonly frameworkRoot: string;
    readonly runGit: GitRunner;
    readonly readFile: FsReader;
    readonly writeFile: FsWriter;
}
export type UpgradeResult = {
    readonly ok: true;
    readonly written: readonly string[];
} | {
    readonly ok: false;
    readonly errors: readonly string[];
};
export declare function upgradeDeployment(opts: UpgradeOptions): Promise<UpgradeResult>;
//# sourceMappingURL=upgrade.d.ts.map