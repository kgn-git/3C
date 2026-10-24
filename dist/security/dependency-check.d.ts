import { type DepAdvisory } from "./deps.js";
import type { Finding } from "./findings.js";
export type DependencyCheck = {
    kind: "unreadable";
} | {
    kind: "checked";
    findings: Finding[];
    note: string;
    advice: string[];
};
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
}, injected: DepAdvisory | undefined, now?: Date): Promise<DependencyCheck>;
//# sourceMappingURL=dependency-check.d.ts.map