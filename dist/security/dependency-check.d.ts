import { type DepAdvisory } from "./deps.js";
import type { Finding } from "./findings.js";
export type DependencyCheck = {
    kind: "unreadable";
} | {
    kind: "outdated";
} | {
    kind: "checked";
    findings: Finding[];
    note: string;
    advice: string[];
};
/** What the gate says about manifests in a change that it cannot read, each kind in its own terms. */
export declare function unreadableManifests(paths: readonly string[]): string;
/**
 * An added or changed dependency is checked only when every copy the lockfile
 * installs is the one registry version npm audited, under its own name. npm's
 * report speaks for that alone, so a second copy, an alias, a git, file or URL
 * source, or a name npm would not accept is named as not checked rather than
 * counted as clean.
 */
export declare function checkDependencies(workspaceDir: string, change: {
    readonly names: readonly string[];
    readonly unverifiable: readonly string[];
    readonly aliasBlocked: readonly string[];
}, injected: DepAdvisory | undefined, now?: Date): Promise<DependencyCheck>;
//# sourceMappingURL=dependency-check.d.ts.map