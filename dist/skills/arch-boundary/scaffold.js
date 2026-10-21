// #246: scaffold a starter architecture.yaml so the boundary gate (VP-03-F05)
// and the architect subagent are discoverable instead of silently inert. The
// starter is all-comments — yaml.load yields no document, so loadArchConfig
// reports it as kind `inert` (declared: false) and the gate stays advisory
// until the team fills it in. Lands at `.<slug>/architecture.yaml`, the path loadArchConfig reads.
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
// #297: shared, comment-only explainer naming every consumer of the file so
// teams filling it in can see the payoff. Exported so the #298 discover draft
// can embed the SAME block (AC4 there) instead of a copy that drifts.
// Behaviour-oriented wording on purpose — internal function names would rot.
export const USAGE_EXPLAINER = `# How this file is used:
#   * \`arch-check check\` — repo-wide boundary gate (local runs and CI) that
#     blocks imports crossing a 'deny' pair and records violations into
#     the findings history the dashboard renders.
#   * the post-edit hook — checks the imports of every file your coding
#     assistant edits, live, against these same rules.
#   * the architect agent — reads these layers when reviewing a diff's
#     dependency direction.
#   * coding assistants generally — the source of truth for which layer new
#     code belongs in, so generated code lands on the right side of a boundary.
`;
// #401 board: the worked example is load-bearing for the hand-edit route —
// the zero-tier discover draft replaces this starter at the active path, so
// the example lives here ONCE and both surfaces emit the same block.
export const EXAMPLE_BLOCK = `# Define 'layers' (directory globs per layer) and 'deny' (forbidden import
# pairs as [from, to]). Example:
#
# layers:
#   domain: ["src/domain/**"]
#   app:    ["src/app/**"]
#   infra:  ["src/infra/**"]
# deny:
#   - ["domain", "infra"]   # domain must not import from infra
#   - ["domain", "app"]
`;
// #430 AC13: split OUT of EXAMPLE_BLOCK deliberately. The example teaches the
// hand-edit route and therefore ships only where a file is hand-edited (the
// starter and the active drafts) — #401's board pinned that a proposal must
// NOT carry it, because the loader never reads a proposal and edits there do
// nothing. The `packages:` shape is different: `arch-check discover` can only
// emit a single ROOT map, so EVERY draft, on either destination, has to say
// that a monorepo needs per-package blocks the draft did not write. One
// constant, two lifetimes.
export const PACKAGES_HINT = `# This map is a single ROOT block: it applies to every path in the
# workspace. A monorepo whose packages have different internal layering needs
# per-package overrides, which have to be written by hand:
#
# packages:
#   "packages/api/**":
#     layers:
#       web:  ["packages/api/web/**"]
#       core: ["packages/api/core/**"]
#     deny:
#       - ["web", "core"]
#
# The first matching glob wins, in the order written. A file matching no
# package glob falls back to the root block above.
`;
const STARTER = `# Architecture boundary rules (VP-03-F05) — STARTER.
# This gate is INERT until you uncomment and define layers below; an unedited
# starter produces no violations. Check it with: arch-check check
#
${USAGE_EXPLAINER}#
${EXAMPLE_BLOCK}#
${PACKAGES_HINT}`;
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