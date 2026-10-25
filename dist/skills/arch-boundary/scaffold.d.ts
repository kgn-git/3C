export interface ScaffoldResult {
    readonly created: boolean;
    readonly path: string;
}
export declare const USAGE_EXPLAINER = "# How this file is used:\n#   * `arch-check check` \u2014 repo-wide boundary gate (local runs and CI) that\n#     blocks imports crossing a 'deny' pair and records violations into\n#     the findings history the dashboard renders.\n#   * the post-edit hook \u2014 checks the imports of every file your coding\n#     assistant edits, live, against these same rules.\n#   * the architect agent \u2014 reads these layers when reviewing a diff's\n#     dependency direction.\n#   * coding assistants generally \u2014 the source of truth for which layer new\n#     code belongs in, so generated code lands on the right side of a boundary.\n";
export declare const EXAMPLE_BLOCK = "# Define 'layers' (directory globs per layer) and 'deny' (forbidden import\n# pairs as [from, to]). Example:\n#\n# layers:\n#   domain: [\"src/domain/**\"]\n#   app:    [\"src/app/**\"]\n#   infra:  [\"src/infra/**\"]\n# deny:\n#   - [\"domain\", \"infra\"]   # domain must not import from infra\n#   - [\"domain\", \"app\"]\n";
export declare const PACKAGES_HINT = "# This map is a single ROOT block: it applies to every path in the\n# workspace. A monorepo whose packages have different internal layering needs\n# per-package overrides, which have to be written by hand:\n#\n# packages:\n#   \"packages/api/**\":\n#     layers:\n#       web:  [\"packages/api/web/**\"]\n#       core: [\"packages/api/core/**\"]\n#     deny:\n#       - [\"web\", \"core\"]\n#\n# The first matching glob wins, in the order written. A file matching no\n# package glob falls back to the root block above.\n";
/** True when the text is the starter as shipped, or holds nothing, so replacing it loses nothing. */
export declare function isUnmodifiedStarter(text: string): boolean;
/**
 * Write the commented starter to `.<slug>/architecture.yaml`. Never clobbers an
 * existing file — returns `{ created: false }` if one is already present.
 */
export declare function writeStarterArchConfig(ws: string, slug: string): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map