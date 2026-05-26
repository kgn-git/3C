export type NormaliseResult = {
    readonly ok: true;
    readonly slug: string;
} | {
    readonly ok: false;
    readonly errors: readonly string[];
};
/**
 * Resolve a user-entered namespace into a brand slug. Empty / whitespace input
 * keeps the framework slug (the default namespace). A non-empty value is
 * validated against the brand-slug rules (kebab-case, 3-32 chars, not reserved).
 */
export declare function normaliseBrandSlug(input: string, frameworkSlug: string): NormaliseResult;
/**
 * Write (or merge) the chosen slug into branding.json under `cwd`, preserving
 * any other deployment fields already present. Returns the path written.
 */
export declare function writeBrandingJson(cwd: string, slug: string): Promise<string>;
/**
 * Prompt for the namespace and resolve it. `ask` is injected so the prompt is
 * testable and so the interactive readline glue stays at the call site.
 */
export declare function promptForNamespace(frameworkSlug: string, ask: (question: string) => Promise<string>): Promise<NormaliseResult>;
//# sourceMappingURL=rebrand.d.ts.map