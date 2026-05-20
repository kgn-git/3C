export type DeriveResult = {
    readonly ok: true;
    readonly slug: string;
} | {
    readonly ok: false;
    readonly errors: readonly string[];
};
export declare function deriveBrandSlug(name: string): DeriveResult;
//# sourceMappingURL=slug-derive.d.ts.map