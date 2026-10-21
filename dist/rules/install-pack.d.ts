import type { ResolvedBrand } from "../branding/types.js";
import { type SecretMatch } from "../validate/secrets.js";
export interface InstallRulePackOptions {
    readonly packageRoot: string;
    readonly workspaceDir: string;
    readonly packName: string;
    readonly brand: ResolvedBrand;
    readonly onExisting: "abort" | "replace";
    /**
     * #452: called with an existing file's path before it is overwritten with
     * different content. A rejection stops that overwrite (fail closed).
     */
    readonly backup?: (absPath: string) => Promise<void>;
}
export interface InstallRulePackSuccess {
    readonly ok: true;
    readonly installed: ReadonlyArray<string>;
    readonly skipped: ReadonlyArray<string>;
    readonly warnings: ReadonlyArray<string>;
}
export interface InstallRulePackFailure {
    readonly ok: false;
    readonly error: string;
    readonly secretHits?: ReadonlyArray<{
        readonly path: string;
        readonly hit: SecretMatch;
    }>;
}
export type InstallRulePackResult = InstallRulePackSuccess | InstallRulePackFailure;
export declare function installRulePack(opts: InstallRulePackOptions): Promise<InstallRulePackResult>;
//# sourceMappingURL=install-pack.d.ts.map