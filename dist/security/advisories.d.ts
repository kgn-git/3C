import type { DepAdvisory } from "./deps.js";
import type { Severity } from "./severity.js";
export declare const STALE_AFTER_DAYS = 7;
export declare const MAX_SNAPSHOT_BYTES: number;
export declare const MAX_ENTRIES = 20000;
export declare const SEMVER: RegExp;
export interface Advisory {
    readonly severity: Severity;
    /** A GHSA id, `npm-<n>`, or `via <package>` when the package is vulnerable only through another. */
    readonly id: string;
}
export interface AdvisorySnapshot {
    readonly schema: 2;
    readonly source: "npm audit";
    readonly npmVersion: string;
    /** The registry npm fetched packages from when it audited; only installs under it are counted. */
    readonly registry: RegistryBinding;
    readonly generatedAt: string;
    /** Every top-level package the lockfile held when npm audited it, by version. */
    readonly audited: Readonly<Record<string, string>>;
    readonly advisories: Readonly<Record<string, Advisory>>;
}
export type AuditParse = {
    kind: "parsed";
    advisories: Record<string, Advisory>;
} | {
    kind: "refused";
    reason: string;
};
export type SnapshotRead = {
    kind: "absent";
} | {
    kind: "outdated";
} | {
    kind: "invalid";
} | {
    kind: "found";
    snapshot: AdvisorySnapshot;
};
/**
 * Where a registry serves from: its origin, and its path held only as a length
 * and a SHA-256. Some registries put an access token in the path (`/<token>/`),
 * so the path itself is never saved.
 */
export interface RegistryBinding {
    readonly origin: string;
    readonly pathLength: number;
    readonly pathSha256: string;
}
/**
 * The registry address `npm config get registry` printed, as origin and path
 * ending in "/", or null when it is not http(s). Credentials, query and
 * fragment are dropped. The result can still hold a token in its path, so it
 * is only ever bound (`bindRegistry`), never saved.
 */
export declare function registryBase(text: string): string | null;
/** The binding a registry base is checked against; null when it is not one. */
export declare function bindRegistry(base: string): RegistryBinding | null;
export declare const isPackageName: (s: unknown) => s is string;
/**
 * Reads `npm audit --json` (report version 2). The whole report is refused when
 * any entry is malformed: a partial map would pass a vulnerable package the
 * report named.
 */
export declare function parseNpmAudit(stdout: string): AuditParse;
export type WorkspaceRead = {
    kind: "absent";
} | {
    kind: "too-large";
} | {
    kind: "unreadable";
} | {
    kind: "read";
    text: string;
};
/**
 * Reads a workspace file through one handle within the cap (CWE-367). A link
 * is refused by lstat (CWE-59), and the handle must be the file lstat saw, so a
 * link swapped in before the open is refused too: by O_NOFOLLOW where the
 * platform has it, and by comparing the two identities everywhere.
 */
export declare function readWorkspaceFile(path: string, max?: number): Promise<WorkspaceRead>;
/** The version of each top-level registry package a lockfile text holds, or null when it is not a lockfile. */
export declare function lockVersions(text: string, registry?: RegistryBinding): Record<string, string> | null;
export interface Install {
    /** Each version installed under this name, at any depth. */
    readonly versions: readonly string[];
    /** Each copy's `resolved` source, empty when it has none, so a moved source reads as a change. */
    readonly sources: readonly string[];
    /**
     * The versions of the copies that are this package itself, from any source.
     * An alias (`"foo": "npm:other@1"`) is another package under this name, so
     * its version is not here.
     */
    readonly ownVersions: readonly string[];
    /**
     * Every copy came from a registry under this name. False for an alias
     * (`"foo": "npm:other@1"`), a git, file or URL source, or no `resolved`.
     */
    readonly verifiable: boolean;
}
/**
 * Every package a lockfile installs, by the folder name a manifest uses. Names
 * and versions are kept as written, valid or not, so a caller can name what it
 * cannot check instead of dropping it. Null when it is not a lockfile.
 */
export declare function lockInstalls(raw: unknown, registry?: RegistryBinding): Map<string, Install> | null;
/** A workspace file read through one handle within the cap, or null. */
export declare function readWorkspaceText(path: string): Promise<string | null>;
export declare const snapshotPath: (ws: string) => string;
export declare function writeAdvisorySnapshot(ws: string, snapshot: AdvisorySnapshot): Promise<void>;
export declare function readAdvisorySnapshot(ws: string, now?: Date): Promise<SnapshotRead>;
export declare function toDepAdvisory(snapshot: AdvisorySnapshot): DepAdvisory;
/** Whole days since the snapshot was taken; a date slightly in the future counts as today. */
export declare function ageInDays(snapshot: AdvisorySnapshot, now: Date): number;
//# sourceMappingURL=advisories.d.ts.map