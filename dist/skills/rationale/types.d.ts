export interface IncidentRef {
    readonly date: string;
    readonly description: string;
    readonly link: string;
}
export interface ResearchRef {
    readonly author: string;
    readonly title: string;
    readonly year: number;
    readonly url: string;
}
export interface Rationale {
    readonly origin: string;
    readonly reasoning: string;
    readonly examples: ReadonlyArray<string>;
    readonly incidents: ReadonlyArray<IncidentRef>;
    readonly research: ReadonlyArray<ResearchRef>;
    readonly docLink: string;
}
export declare function normalizeRationale(raw: unknown): Rationale;
//# sourceMappingURL=types.d.ts.map