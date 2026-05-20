import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanSecrets } from "../validate/secrets.js";
import { findingId } from "./findings.js";
// AC1/AC6: read each changed file locally, run the shipped secret scanner,
// and surface ONLY the redacted form — never the raw match or file content.
export const defaultLocalScanner = {
    async scan({ workspaceDir, changedFiles }) {
        const out = [];
        for (const rel of changedFiles) {
            let text;
            try {
                text = await readFile(join(workspaceDir, rel), "utf8");
            }
            catch {
                continue;
            }
            const { hits } = scanSecrets(text);
            hits.forEach((h, i) => {
                const ruleId = `secret:${h.type}`;
                out.push({
                    id: findingId(ruleId, rel, i + 1),
                    severity: "high",
                    ruleId,
                    file: rel,
                    line: i + 1,
                    detail: `possible ${h.type} secret (${h.redacted})`,
                });
            });
        }
        return out;
    },
};
//# sourceMappingURL=scanner.js.map