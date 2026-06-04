export interface VersionTriple {
    readonly pkgVersion: string;
    readonly frameworkVersion: string;
    /** A release tag like `v1.6.0`, if building a tagged release. */
    readonly tag?: string;
}
/** Throw if package.json, framework.json, and (when given) the git tag disagree. */
export declare function assertVersionsAgree({ pkgVersion, frameworkVersion, tag, }: VersionTriple): void;
/** Return a clone of the framework config with FRAMEWORK_VERSION set to the package version. */
export declare function deriveFrameworkVersion<T extends Record<string, unknown>>(framework: T, pkgVersion: string): T;
/** Read the version from the nearest package.json (defaults to the package root). */
export declare function readPackageVersion(packageRoot?: string): string;
//# sourceMappingURL=version.d.ts.map