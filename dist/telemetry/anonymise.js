import { createHmac } from "node:crypto";
// AC5 / NFR-PRIV-01: raw identity is never persisted; the token is a
// stable per-project HMAC of the raw id (salt is per-project).
export function anonymiseId(rawId, salt) {
    return createHmac("sha256", salt).update(rawId).digest("hex").slice(0, 16);
}
//# sourceMappingURL=anonymise.js.map