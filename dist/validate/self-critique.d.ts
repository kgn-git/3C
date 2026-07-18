/** The emitter shape decides the marker convention (binding constraint #1). */
export type EmitterType = "prose" | "json";
/** A self-critique gate check result. */
export interface SelfCritiqueCheck {
    readonly valid: boolean;
    readonly hasSection: boolean;
    readonly hasCritiqueProse: boolean;
    readonly hasMarker: boolean;
    readonly reason: string;
}
/** The 6 review agents that emit a fenced JSON findings array (in-JSON marker). */
export declare const REVIEW_AGENTS: ReadonlyArray<string>;
/** Explicitly exempt skills/agents (AC5) — interactive or reference, not emission gates. */
export declare const EXEMPT_NAMES: ReadonlyArray<string>;
/** True if the skill/agent basename is explicitly exempt (no silent exemptions). */
export declare function isExempt(name: string): boolean;
/** Resolve the emitter type for a skill/agent basename. Review agents → JSON; all else → prose. */
export declare function emitterTypeFor(name: string): EmitterType;
/**
 * Check that `content` carries a conforming self-critique gate for the given emitter type. A
 * conforming gate: a `## Self-critique` section whose body describes a critique of the reasoning
 * AND the output plus at least one optimisation pass (not a stamp), and emits the correct marker —
 * `SELF-CRITIQUE: PASS` for prose, the `self_critique` JSON field for JSON emitters.
 */
export declare function checkSelfCritique(content: string, emitter: EmitterType): SelfCritiqueCheck;
//# sourceMappingURL=self-critique.d.ts.map