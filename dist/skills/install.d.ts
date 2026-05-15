import type { ResolvedBrand } from "../branding/types.js";
export interface InstallSkillsOptions {
    readonly sourceDir: string;
    readonly destDir: string;
    readonly brand: ResolvedBrand;
    readonly onExisting: "abort" | "replace";
}
export type InstallSkillsResult = {
    readonly ok: true;
    readonly installed: ReadonlyArray<string>;
    readonly skipped: ReadonlyArray<string>;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function installSkills(opts: InstallSkillsOptions): Promise<InstallSkillsResult>;
//# sourceMappingURL=install.d.ts.map