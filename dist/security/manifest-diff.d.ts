export interface ManifestPair {
    /** Repo-relative path of a `package.json`, `package-lock.json` or `npm-shrinkwrap.json`. */
    readonly path: string;
    /** Content at the base of the span; null when the file did not exist there. */
    readonly base: string | null;
    /** Content now; null when the change deletes the file. */
    readonly head: string | null;
}
export interface DependencyChange {
    /** Each package added or changed, named once, in first-seen order. */
    readonly names: string[];
    /**
     * Names npm audit cannot speak for under that name: an npm alias, or a git,
     * file, URL or other source that is not a registry.
     */
    readonly unverifiable: string[];
    /** Manifests whose new content does not parse, so the gate can fail closed. */
    readonly unparseable: string[];
    /**
     * Names some manifest declares from a non-registry source other than the
     * root package.json's own `npm:` alias. The check reads only the root tree,
     * so such a name cannot be checked through an alias's target.
     */
    readonly aliasBlocked: string[];
}
/** The npm aliases a manifest declares (`"foo": "npm:other@1"`), folder name to target. */
export declare function npmAliases(manifest: unknown): Map<string, string>;
/**
 * The aliases a package.json text declares. A text that does not parse
 * declares none, so a lockfile name mismatch counts as the package itself:
 * the direction that reports a flagged version rather than hiding it.
 */
export declare function declaredAliasesOf(text: string | null): Map<string, string>;
/** True for the two lockfile names npm reads; it prefers npm-shrinkwrap.json. */
export declare const isLockfile: (path: string) => boolean;
export declare function changedDependencies(manifests: readonly ManifestPair[]): DependencyChange;
//# sourceMappingURL=manifest-diff.d.ts.map