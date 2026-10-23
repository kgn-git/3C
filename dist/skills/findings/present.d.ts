import type { Presentation } from "../../output/index.js";
import type { FindingsRun } from "./types.js";
/**
 * The clean case is interpreted too — a bare zero teaches users to ignore it.
 *
 * Two things this deliberately does NOT do:
 *
 *   - It does not describe every stored run as a boundary finding. Keeping the
 *     on-disk path is what lets an adopter's older-version history survive the
 *     upgrade, and that history is keyed by rules this version cannot produce
 *     (`import-order`, `naming-convention`). Labelling those "boundary
 *     findings" and offering `arch-check except` as the remedy is false in
 *     every clause — the compatibility contract would be met in form and
 *     broken in substance.
 *   - It does not present the newest run as a current verdict. Only a run WITH
 *     violations is ever appended, so a team that fixes its last violation
 *     would otherwise see that violation reported forever. Every line is dated
 *     so a stale run reads as history.
 */
export declare function presentFindings(latest: FindingsRun | undefined): Presentation;
//# sourceMappingURL=present.d.ts.map