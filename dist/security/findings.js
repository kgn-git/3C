import { createHash } from "node:crypto";
export function findingId(ruleId, file, line) {
    return createHash("sha256")
        .update(`${ruleId}|${file.replace(/\\/g, "/")}|${line}`)
        .digest("hex")
        .slice(0, 12);
}
//# sourceMappingURL=findings.js.map