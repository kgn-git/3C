#!/usr/bin/env node
import type { GitRunner } from "./coverage/diff.js";
import type { Scanner } from "./security/findings.js";
import type { GitRunner as DeployInitGitRunner } from "./skills/deploy-init/verify-commit.js";
import type { CmdRunner, GitRunner as DeployGitRunner } from "./skills/deploy/preflight.js";
import type { SpawnFn } from "./skills/create-issue.js";
export interface DeployInitArgs {
    readonly brandName: string;
    readonly brandSlug: string | undefined;
    readonly fork: boolean;
    readonly cwd: string;
    readonly frameworkRoot: string;
    readonly frameworkSlug: string;
    readonly frameworkVersion: string;
    readonly upstreamRef: string;
    readonly upstreamSource: {
        readonly type: "github";
        readonly repo: string;
    };
    readonly installUuid: string;
    readonly orgMetadata?: {
        readonly org_legal_entity: string;
    };
    readonly runGit: DeployInitGitRunner;
    readonly writeFile: (path: string, content: string) => Promise<void>;
    readonly log: (msg: string) => void;
    readonly err: (msg: string) => void;
}
export declare function runDeployInit(args: DeployInitArgs): Promise<number>;
export interface DeployUpgradeArgs {
    readonly newUpstreamRef: string;
    readonly newFrameworkVersion: string;
    readonly cwd: string;
    readonly frameworkRoot: string;
    readonly runGit: DeployInitGitRunner;
    readonly readFile: (path: string) => Promise<string>;
    readonly writeFile: (path: string, content: string) => Promise<void>;
    readonly log: (msg: string) => void;
    readonly err: (msg: string) => void;
}
export declare function runDeployUpgrade(args: DeployUpgradeArgs): Promise<number>;
export interface DashboardEnv {
    readonly cwd: string;
    readonly now?: Date;
    readonly open?: (path: string) => Promise<void>;
}
export declare function dashboardCommand(argv: readonly string[], env?: DashboardEnv): Promise<number>;
export interface CoverageGateEnv {
    readonly cwd: string;
    readonly runner?: GitRunner;
    readonly log?: (msg: string) => void;
}
export declare function coverageGateCommand(_argv: readonly string[], env?: CoverageGateEnv): Promise<number>;
export interface SecurityEnv {
    readonly cwd: string;
    readonly scanner?: Scanner;
    readonly runner?: GitRunner;
    readonly log?: (msg: string) => void;
}
export declare function securityCommand(argv: readonly string[], env?: SecurityEnv): Promise<number>;
export interface DebugEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function debugCommand(argv: readonly string[], env?: DebugEnv): Promise<number>;
export interface BugEnvCli {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    readonly spawn?: SpawnFn;
}
export declare function bugCommand(argv: readonly string[], env?: BugEnvCli): Promise<number>;
export interface DriftEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function driftCommand(argv: readonly string[], env?: DriftEnv): Promise<number>;
export interface ArchEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function archCommand(argv: readonly string[], env?: ArchEnv): Promise<number>;
export interface StandardsEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function standardsCommand(argv: readonly string[], env?: StandardsEnv): Promise<number>;
export interface DeployEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    readonly runner?: CmdRunner;
    readonly gitRunner?: DeployGitRunner;
}
export declare function deployCommand(argv: readonly string[], env?: DeployEnv): Promise<number>;
export interface ExplainEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function explainCommand(argv: readonly string[], env?: ExplainEnv): Promise<number>;
export interface OnboardEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function onboardCommand(argv: readonly string[], env?: OnboardEnv): Promise<number>;
export interface OnboardGuideEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
}
export declare function onboardGuideCommand(argv: readonly string[], env?: OnboardGuideEnv): Promise<number>;
export declare function main(argv: readonly string[]): Promise<number>;
//# sourceMappingURL=cli.d.ts.map