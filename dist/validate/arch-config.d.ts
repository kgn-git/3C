import type { LayerMap } from "./post-edit/types.js";
export interface ArchConfig {
    readonly root: LayerMap | null;
    readonly packages: ReadonlyArray<readonly [string, LayerMap]>;
}
/**
 * #430: what the loader found, as four distinguishable answers.
 *
 * Before this, one `null` meant absent, inert AND malformed, so each of five
 * consumers guessed — and two guessed wrong in a way that cost the adopter
 * their work (`discover` overwrote an unparseable-but-populated config at the
 * active path; `doctor` steered them into that route). The kinds are what let
 * the gate fail CLOSED on a broken config while an unedited starter stays
 * inert at exit 0, which is what makes arming the post-edit hook (#384) safe.
 */
export type ArchConfigResult = {
    readonly kind: "absent";
}
/** Parses, but there is nothing to enforce — the comment-only starter, an
 *  empty layer map, or a config whose every `deny` list is empty. Advisory,
 *  never blocking: `arch-check discover` legitimately produces this state.
 *  `declared` separates the two very different files that land here: an
 *  unedited starter (nothing to lose) from a config whose layer names the
 *  adopter chose and whose deny list is merely still empty. */
 | {
    readonly kind: "inert";
    readonly detail: string;
    readonly declared: boolean;
}
/** Present but unusable. The gate MUST fail closed; `detail` names why. */
 | {
    readonly kind: "malformed";
    readonly detail: string;
} | {
    readonly kind: "ok";
    readonly config: ArchConfig;
};
/** The single owner of where this file lives, so a probe can never disagree
 *  with the loader about which file it means (#401 fixed one such divergence
 *  in doctor.ts by hand). */
export declare function archConfigPath(ws: string): string;
/** True when the gate has nothing to enforce and should stay advisory.
 *  A PURE predicate over the loader's result — not a `ws`-taking function,
 *  which would read the file a second time on the always-on hook path and
 *  open a check-then-use gap (CWE-367). `malformed` is deliberately NOT
 *  inert: treating it as such is the fail-open this taxonomy closes. */
export declare function isGateInert(r: ArchConfigResult): r is Extract<ArchConfigResult, {
    kind: "absent" | "inert";
}>;
/**
 * True when the file holds declarations the adopter authored, so replacing it
 * would destroy work.
 *
 * Deliberately NOT the same question as `isGateInert`, and conflating the two
 * is how `discover` came to clobber configs: "enforces nothing" (the gate's
 * question) and "there is nothing here to lose" (discover's question) diverge
 * on exactly two files — a config whose layers are named but whose `deny`
 * list is still empty, and one that does not parse. Both hold real work.
 * `malformed` counts as authored precisely because we could NOT read it: when
 * the answer is unknowable the safe reading is that it matters.
 */
export declare function hasAuthoredContent(r: ArchConfigResult): boolean;
export declare function loadArchConfig(ws: string): Promise<ArchConfigResult>;
export type RuleSource = {
    readonly kind: "root";
} | {
    readonly kind: "package";
    readonly glob: string;
};
export interface ResolvedRules {
    readonly map: LayerMap;
    /** Which block produced the map — a discriminated shape, so an adopter's
     *  `packages:` key can never collide with the root sentinel. */
    readonly source: RuleSource;
}
/** The source-free form of `resolveRulesWithSource`, kept for callers that
 *  only need the map. */
export declare function resolveRules(cfg: ArchConfig, relPath: string): LayerMap | null;
export declare function resolveRulesWithSource(cfg: ArchConfig, relPath: string): ResolvedRules | null;
/**
 * Clamp an adopter-authored YAML string before it is interpolated into an
 * agent-facing advisory: control characters stripped, length capped, so a
 * crafted key cannot forge additional advisory lines (CWE-117). Used for
 * `packages:` globs here and for layer names in the violation kernel — the
 * two channels share one advisory line and must share one clamp.
 */
export declare function clampLabel(s: string): string;
/** The longest label an advisory carries. */
export declare const MAX_LABEL_CHARS = 120;
/**
 * The code points `clampLabel` strips, as inclusive ranges — exported so a
 * test can enumerate EVERY one rather than a hand-picked few (#430 shipped a
 * clamp test asserting the absence of characters its input never held).
 * C0 and C1 controls and DEL; bidi marks, embeddings, overrides and isolates (Trojan
 * Source); line and paragraph separators; and (#440) the invisible format
 * characters — ARABIC LETTER MARK, the zero-width space/joiners, the BOM and
 * the soft hyphen — which render as nothing, so `ui` + U+200B looked exactly
 * like a declared `ui`. Written as escapes: this file must never again carry
 * the characters themselves, which made it unreadable to review.
 */
export declare const LABEL_STRIP_RANGES: ReadonlyArray<readonly [number, number]>;
/**
 * Why a layer name cannot round-trip into an `except` key, or null. Names the
 * cause that FIRED (#440 AC16) — length, an invisible character (by code
 * point and position, never rendered raw), edge whitespace, or a quote/`>` —
 * where one message used to blame a quote for all of them.
 */
export declare function layerNameProblem(name: string): string | null;
/**
 * The advisory suffix naming which `packages:` block produced a finding.
 * One encoding, used by both the post-edit hook and the arch-check gate.
 */
export declare function packageSuffix(glob: string): string;
//# sourceMappingURL=arch-config.d.ts.map