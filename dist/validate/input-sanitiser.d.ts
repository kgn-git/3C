export interface SanitiseResult {
    readonly clean: string;
    readonly rejected: boolean;
    readonly reasons: ReadonlyArray<string>;
}
export declare function sanitiseInput(text: string): SanitiseResult;
//# sourceMappingURL=input-sanitiser.d.ts.map