export type Suppressions = Readonly<Record<string, string>>;
export declare function loadSuppressions(ws: string): Promise<Suppressions>;
export declare function addSuppression(ws: string, id: string, reason: string): Promise<void>;
export declare function isSuppressed(id: string, supps: Suppressions): boolean;
//# sourceMappingURL=suppress.d.ts.map