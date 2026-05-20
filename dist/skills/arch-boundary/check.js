// #19 AC1/AC2: per-file boundary check. The validation kernel is #16's
// checkLayerImport (reused, not reimplemented — CS-04). Non-expired
// exceptions are filtered out here.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkLayerImport } from "../../validate/post-edit/layers.js";
import { resolveRules } from "./config.js";
import { isExcepted } from "./exceptions.js";
// checkLayerImport message: `"X" layer must not import from "Y" layer`.
const MSG_RE = /"([^"]+)" layer must not import from "([^"]+)" layer/;
export function exceptionKey(message) {
    const m = MSG_RE.exec(message);
    return m ? `${m[1]}->${m[2]}` : null;
}
export async function checkFiles(ws, files, cfg, exceptions, now) {
    const out = [];
    for (const rel of files) {
        const relPosix = rel.split("\\").join("/");
        const map = resolveRules(cfg, relPosix);
        if (!map)
            continue;
        let content;
        try {
            content = await readFile(join(ws, rel), "utf8");
        }
        catch {
            continue;
        }
        for (const v of checkLayerImport(relPosix, content, map)) {
            const key = exceptionKey(v.message);
            if (key && isExcepted(exceptions, key, now))
                continue;
            out.push({
                ruleId: "layer-boundary",
                file: relPosix,
                line: v.line,
                message: v.message,
            });
        }
    }
    return out;
}
//# sourceMappingURL=check.js.map