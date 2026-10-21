/**
 * How this module runs git, and the seam a test injects through.
 *
 * #396 moved this out of `src/coverage/diff.ts`, which the coverage-gate
 * retirement deleted. It was never coverage's to own: the gate's own consumer
 * comment in `files.ts` records that the security file-set deliberately does NOT
 * use `gitChangedLines`, and after the retirement `defaultGitRunner` and this
 * type were the only two exports of that file with a live caller. The rest —
 * `parseChangedLines`, `gitChangedLines`, `FileChange` — had exactly one caller
 * each (`src/coverage/index.ts`) and went with it, rather than being relocated
 * as dead code wearing a new path.
 *
 * Same layer either way: `src/coverage/**` and `src/security/**` are both
 * `engine` in `.3c/architecture.yaml`, so this crosses no boundary.
 */
export type GitRunner = (args: string[]) => Promise<string>;
/**
 * The git invocation the product actually makes when no runner is injected.
 * Exported because #408 found that `security scan` shipped with the dependency
 * half wired to `opts.runner ? … : ""` — so it ran only under tests that
 * injected one, and never once from the CLI.
 */
export declare const defaultGitRunner: GitRunner;
//# sourceMappingURL=git.d.ts.map