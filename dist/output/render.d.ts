import type { Presentation } from "./presentation.js";
/**
 * Renders the envelope, and only the envelope: block ordering, spacing, and the
 * numbered step list. Interpretation stays with the calling skill.
 */
export declare function renderConsole(p: Presentation): string;
/** Machine-readable form. `nextSteps` is always an array, never omitted. */
export declare function renderJson(p: Presentation): string;
/**
 * Escapes every field here so no caller has to remember to (CWE-79). This is
 * the render boundary — data arrives untrusted and leaves encoded.
 */
export declare function renderHtml(p: Presentation): string;
//# sourceMappingURL=render.d.ts.map