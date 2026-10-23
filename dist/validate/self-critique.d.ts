export type EmitterType = "prose" | "json";
export interface SelfCritiqueCheck {
    readonly valid: boolean;
    readonly hasSection: boolean;
    readonly hasCritiqueProse: boolean;
    readonly hasMarker: boolean;
    readonly reason: string;
}
/** Review agents that emit a fenced JSON findings array. */
export declare const REVIEW_AGENTS: ReadonlyArray<string>;
/** Interactive, so there is no reviewable artefact to gate. */
export declare const EXEMPT_NAMES: ReadonlyArray<string>;
export declare function isExempt(name: string): boolean;
export declare function emitterTypeFor(name: string): EmitterType;
export declare function checkSelfCritique(content: string, emitter: EmitterType): SelfCritiqueCheck;
//# sourceMappingURL=self-critique.d.ts.map