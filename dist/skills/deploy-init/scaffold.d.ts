import type { OrgMetadata, UpstreamSource } from "./types.js";
import { type GitRunner } from "./verify-commit.js";
export type FsWriter = (path: string, content: string) => Promise<void>;
export interface ScaffoldOptions {
    readonly brandName: string;
    readonly brandSlug?: string;
    readonly brandLong?: string;
    readonly brandVersion?: string;
    readonly cwd: string;
    readonly frameworkRoot: string;
    readonly frameworkSlug: string;
    readonly frameworkVersion: string;
    readonly upstreamRef: string;
    readonly upstreamSource: UpstreamSource;
    readonly installUuid: string;
    readonly strict: boolean;
    readonly orgMetadata?: OrgMetadata;
    readonly runGit: GitRunner;
    readonly writeFile: FsWriter;
}
export type ScaffoldResult = {
    readonly ok: true;
    readonly written: readonly string[];
} | {
    readonly ok: false;
    readonly errors: readonly string[];
};
export declare function scaffoldDeployment(opts: ScaffoldOptions): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map