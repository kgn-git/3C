import { createHash } from "node:crypto";
/**
 * Keyed on what was found, not where: a positional id would let a new secret
 * inserted above a suppressed one inherit its suppression (fail-open).
 * Identical secrets in one file therefore share an id; accepted.
 * Unsalted on purpose: a committed suppression must match in every clone. An
 * id leaked without its file could be dictionary-tested; accepted, since the
 * suppressed value already sits in the same repository.
 */
export function findingId(ruleId, file, discriminator) {
    return createHash("sha256")
        .update(`${ruleId}|${file.replace(/\\/g, "/")}|${discriminator}`)
        .digest("hex")
        .slice(0, 12);
}
/** Hashed so the raw secret stays out of the id input. */
export function matchDigest(raw) {
    return createHash("sha256").update(raw).digest("hex");
}
//# sourceMappingURL=findings.js.map