// #246: scaffold a starter architecture.yaml so the boundary gate (VP-03-F05)
// and the architect subagent are discoverable instead of silently inert. The
// starter is all-comments — yaml.load yields no document, so loadArchConfig
// returns null and the gate produces zero violations until the team fills it
// in. Lands at `.<slug>/architecture.yaml`, the path loadArchConfig reads.
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
// #297: shared, comment-only explainer naming every consumer of the file so
// teams filling it in can see the payoff. Exported so the #298 discover draft
// can embed the SAME block (AC4 there) instead of a copy that drifts.
// Behaviour-oriented wording on purpose — internal function names would rot.
export const USAGE_EXPLAINER = `# How this file is used:
#   * \`arch-check check\` — repo-wide boundary gate (local runs and CI) that
#     blocks imports crossing a 'deny' pair and records violations into
#     drift history.
#   * the post-edit hook — checks the imports of every file your coding
#     assistant edits, live, against these same rules.
#   * the architect agent — reads these layers when reviewing a diff's
#     dependency direction.
#   * coding assistants generally — the source of truth for which layer new
#     code belongs in, so generated code lands on the right side of a boundary.
`;
const STARTER = `# Architecture boundary rules (VP-03-F05) — STARTER.
# This gate is INERT until you uncomment and define layers below; an unedited
# starter produces no violations. Check it with: arch-check check
#
${USAGE_EXPLAINER}#
# Define 'layers' (directory globs per layer) and 'deny' (forbidden import
# pairs as [from, to]). Example:
#
# layers:
#   domain: ["src/domain/**"]
#   app:    ["src/app/**"]
#   infra:  ["src/infra/**"]
# deny:
#   - ["domain", "infra"]   # domain must not import from infra
#   - ["domain", "app"]
#
# Monorepo per-package overrides:
# packages:
#   "packages/api/**":
#     layers: { ... }
#     deny:   [ ... ]
`;
/**
 * Write the commented starter to `.<slug>/architecture.yaml`. Never clobbers an
 * existing file — returns `{ created: false }` if one is already present.
 */
export async function writeStarterArchConfig(ws, slug) {
    const dir = join(ws, "." + slug);
    const path = join(dir, "architecture.yaml");
    try {
        await stat(path);
        return { created: false, path }; // already configured — leave it untouched
    }
    catch {
        /* not present — create below */
    }
    await mkdir(dir, { recursive: true });
    await writeFile(path, STARTER, "utf8");
    return { created: true, path };
}
//# sourceMappingURL=scaffold.js.map