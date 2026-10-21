import { createHash } from "node:crypto";
/**
 * A finding's stable, opaque id — what `security suppress` records (#413).
 *
 * Keyed on WHAT was found, never WHERE: `discriminator` is a hash of the raw
 * match for a secret, or `package|cve` for a dependency. A line (or the hit
 * ordinal, before #413) in the id let a NEW secret inserted above a
 * suppressed one inherit its suppression — a fail-open — and voided a
 * suppression on any edit that shifted lines. The raw value is hashed, never
 * stored: identical secrets in one file share an id, which is one risk.
 *
 * ACCEPTED TRADE-OFF (#413 board): the digest is unsalted and fast, so an id
 * that leaks WITHOUT its file could in principle be dictionary-tested against
 * candidate values (a weak password inside a connection string). It is not
 * keyed per workspace because a suppression is committed and must mean the
 * same finding in every clone; and a suppressed value already sits in the
 * same repository as the id that names it. Only 48 bits of it are printed.
 */
export function findingId(ruleId, file, discriminator) {
    return createHash("sha256")
        .update(`${ruleId}|${file.replace(/\\/g, "/")}|${discriminator}`)
        .digest("hex")
        .slice(0, 12);
}
/** The id discriminator for a raw secret match: a digest, so the value itself never reaches the id input. */
export function matchDigest(raw) {
    return createHash("sha256").update(raw).digest("hex");
}
//# sourceMappingURL=findings.js.map