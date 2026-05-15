import type { ResolvedBrand } from "../branding/types.js";
export interface InstallAgentsOptions {
    readonly sourceDir: string;
    readonly destDir: string;
    readonly brand: ResolvedBrand;
    readonly onExisting: "abort" | "replace";
}
export type InstallAgentsResult = {
    readonly ok: true;
    readonly installed: ReadonlyArray<string>;
    readonly skipped: ReadonlyArray<string>;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function installAgents(opts: InstallAgentsOptions): Promise<InstallAgentsResult>;
//# sourceMappingURL=install.d.ts.map