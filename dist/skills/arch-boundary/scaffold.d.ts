export interface ScaffoldResult {
    readonly created: boolean;
    readonly path: string;
}
export declare const USAGE_EXPLAINER = "# How this file is used:\n#   * `arch-check check` \u2014 repo-wide boundary gate (local runs and CI) that\n#     blocks imports crossing a 'deny' pair and records violations into\n#     drift history.\n#   * the post-edit hook \u2014 checks the imports of every file your coding\n#     assistant edits, live, against these same rules.\n#   * the architect agent \u2014 reads these layers when reviewing a diff's\n#     dependency direction.\n#   * coding assistants generally \u2014 the source of truth for which layer new\n#     code belongs in, so generated code lands on the right side of a boundary.\n";
/**
 * Write the commented starter to `.<slug>/architecture.yaml`. Never clobbers an
 * existing file — returns `{ created: false }` if one is already present.
 */
export declare function writeStarterArchConfig(ws: string, slug: string): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map