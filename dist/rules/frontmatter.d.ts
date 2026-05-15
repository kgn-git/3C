export interface FrontmatterResult {
    readonly fields: Record<string, string | number | string[]>;
    readonly body: string;
    readonly bodyStartLine: number;
}
export interface FrontmatterError {
    readonly line: number;
    readonly message: string;
}
export type FrontmatterParseResult = {
    readonly ok: true;
    readonly value: FrontmatterResult;
} | {
    readonly ok: false;
    readonly error: FrontmatterError;
};
export declare function parseFrontmatter(source: string): FrontmatterParseResult;
//# sourceMappingURL=frontmatter.d.ts.map