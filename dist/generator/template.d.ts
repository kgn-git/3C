import type { ResolvedBrand } from "../branding/types.js";
export interface Selections {
    readonly projectType: string;
    readonly language: string;
    readonly architecture: string;
    readonly testMethodology: string;
    readonly testFramework: string;
    readonly securityFrameworks: ReadonlyArray<string>;
    readonly securityTooling: ReadonlyArray<string>;
}
export interface ProvenanceData {
    readonly generatedAt: string;
    readonly inputHash: string;
}
export interface RenderInput {
    readonly baseTemplate: string;
    readonly selections: Selections;
    readonly fragments: ReadonlyMap<string, string>;
    readonly brand: ResolvedBrand;
    readonly provenance: ProvenanceData;
}
export declare function renderTemplate(input: RenderInput): string;
//# sourceMappingURL=template.d.ts.map