import type { LayerMap } from "./post-edit/types.js";
export interface ArchConfig {
    readonly root: LayerMap | null;
    readonly packages: ReadonlyArray<readonly [string, LayerMap]>;
}
/**
 * Distinct kinds so the gate fails closed on a broken config while an
 * unedited starter stays inert at exit 0.
 */
export type ArchConfigResult = {
    readonly kind: "absent";
}
/** Parses but enforces nothing; advisory. `declared` separates an unedited
 *  starter (nothing to lose) from adopter-named layers with no deny yet. */
 | {
    readonly kind: "inert";
    readonly detail: string;
    readonly declared: boolean;
}
/** The gate MUST fail closed; `detail` names why. */
 | {
    readonly kind: "malformed";
    readonly detail: string;
} | {
    readonly kind: "ok";
    readonly config: ArchConfig;
};
/** Single owner of the path, so a probe cannot disagree with the loader. */
export declare function archConfigPath(ws: string): string;
/** Where discover sends a draft it must not write over the active config. */
export declare function archProposedPath(ws: string): string;
/** Pure over the loaded result: re-reading the file would open a
 *  check-then-use gap (CWE-367). `malformed` is not inert: that would fail open. */
export declare function isGateInert(r: ArchConfigResult): r is Extract<ArchConfigResult, {
    kind: "absent" | "inert";
}>;
/**
 * True when replacing the file would destroy adopter work. Not `isGateInert`:
 * named layers with no deny, and an unparseable file, enforce nothing yet hold
 * work. `malformed` counts as authored because unknowable means assume it matters.
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
    /** Discriminated so a `packages:` key cannot collide with the root sentinel. */
    readonly source: RuleSource;
}
export declare function resolveRules(cfg: ArchConfig, relPath: string): LayerMap | null;
export declare function resolveRulesWithSource(cfg: ArchConfig, relPath: string): ResolvedRules | null;
/**
 * So a crafted key cannot forge advisory lines (CWE-117). Globs and layer
 * names share one advisory line, so they share this clamp.
 */
export declare function clampLabel(s: string): string;
export declare const MAX_LABEL_CHARS = 120;
/**
 * Inclusive ranges, exported so a test can enumerate every one. Controls, bidi
 * (Trojan Source), line separators and invisible format characters, which make
 * `ui` + U+200B look like `ui`. Escapes keep this file reviewable.
 */
export declare const LABEL_STRIP_RANGES: ReadonlyArray<readonly [number, number]>;
/**
 * Why a layer name cannot round-trip into an `except` key, or null. Names the
 * specific cause; invisible characters are cited by code point, never raw.
 */
export declare function layerNameProblem(name: string): string | null;
/** Shared so the hook and the gate encode the block identically. */
export declare function packageSuffix(glob: string): string;
//# sourceMappingURL=arch-config.d.ts.map