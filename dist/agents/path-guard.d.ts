export interface PathGuardEvent {
    readonly agent: string;
    readonly tool: "Read" | "Grep" | "Glob" | "Edit" | "Write" | "Bash" | string;
    readonly path: string;
}
export interface PathGuardDecision {
    readonly allow: boolean;
    readonly reason?: string;
}
/** True when a file path names a protected secret, however it is spelled. */
export declare function isSecretPath(path: string): boolean;
/** True when a search path or glob would reach a protected secret. */
export declare function namesSecretPath(pathOrGlob: string): boolean;
/**
 * True when a glob field would reach a protected secret. In a glob a
 * backslash escapes the next character (`.\env` is `.env` to ripgrep), so it
 * spells a name no text match sees; a path field keeps it as a separator.
 */
export declare function namesSecretGlob(glob: string): boolean;
/**
 * True when a glob that selects which files' content is returned could match
 * a secret. The last segment is judged by its shape: allowed only when it
 * starts with a literal character other than a dot (no `.env…` name can match
 * it), or is `*.<ext>` / `*.{a,b}` with every extension on the content
 * allow-list. So `*`, `*nv`, `.e*` and `*.production` count and `*.ts` does
 * not; an env file named with an allowed extension (`.env.json`) is the
 * accepted residual. A secret's file name (`credentials`) counts wherever
 * it could be read as one. A negating `!` or a space (which some tools split on)
 * cannot be judged as one plain inclusion, so it counts too. The search root
 * itself is judged by `insideProject` in src/cli/hook-path-guard.ts.
 */
export declare function contentGlobReachesSecret(glob: string): boolean;
/**
 * True when a search root names a protected secret as text. A root is a
 * literal folder, so brackets in it are plain characters (`app/[id]`).
 */
export declare function namesSecretRoot(root: string): boolean;
export declare function enforceAgentPathPolicy(event: PathGuardEvent): PathGuardDecision;
//# sourceMappingURL=path-guard.d.ts.map