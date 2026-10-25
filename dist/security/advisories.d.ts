import type { DepAdvisory } from "./deps.js";
import type { Severity } from "./severity.js";
export declare const STALE_AFTER_DAYS = 7;
declare const SCHEMA: 3;
export declare const MAX_SNAPSHOT_BYTES: number;
export declare const MAX_ENTRIES = 20000;
export declare const SEMVER: RegExp;
export interface Advisory {
    readonly severity: Severity;
    /** A GHSA id, `npm-<n>`, or `via <package>` when the package is vulnerable only through another. */
    readonly id: string;
}
/** What a declared npm alias installed when npm audited it; npm reports it under the target's name. */
export interface AliasRecord {
    readonly target: string;
    readonly version: string;
}
export interface AdvisorySnapshot {
    readonly schema: typeof SCHEMA;
    readonly source: "npm audit";
    readonly npmVersion: string;
    /** The registry npm fetched packages from when it audited; only installs under it are counted. */
    readonly registry: RegistryBinding;
    readonly generatedAt: string;
    /** Every top-level package the lockfile held when npm audited it, by version. */
    readonly audited: Readonly<Record<string, string>>;
    /** Each alias the root manifest declared, by the folder name it installs under. */
    readonly aliases: Readonly<Record<string, AliasRecord>>;
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
 * so the path itself is never saved. The digest is unsalted on purpose: such
 * tokens are long machine-generated values, the same path sits in plaintext in
 * `.npmrc` for anyone who can read this cache, a key kept in the workspace
 * would add nothing against that reader, and binding to the origin alone would
 * let another repository on the same host count as this one.
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
/**
 * The version of each top-level registry package a lockfile text holds, or
 * null when it is not a lockfile. A copy whose lockfile name differs from its
 * folder is left out, declared alias or not: npm audits a copy under its
 * lockfile name, so recording it under the folder would claim an audit npm
 * never made.
 */
export declare function lockVersions(text: string, registry?: RegistryBinding): Record<string, string> | null;
/**
 * Each declared alias a lockfile text installs from the registry, with its
 * target's version. The registry test is the strict one the check applies, so
 * every record saved here is one the check can match.
 */
export declare function lockAliases(text: string, registry: RegistryBinding, aliases: ReadonlyMap<string, string>): Record<string, AliasRecord>;
export interface Install {
    /** Each version installed under this name, at any depth. */
    readonly versions: readonly string[];
    /** Each copy's `resolved` source, empty when it has none, so a moved source reads as a change. */
    readonly sources: readonly string[];
    /**
     * The versions of the copies that are this package itself, from any source.
     * An alias (`"foo": "npm:other@1"`) is another package under this name, so
     * its version is not here. A top-level copy counts as an alias only when the
     * root manifest declares it; a nested one, whose declaration sits in a
     * manifest the check does not read, whenever its lockfile name differs.
     */
    readonly ownVersions: readonly string[];
    /**
     * Every copy came from a registry under this name. False for an alias, a
     * name mismatch, a git, file or URL source, no `resolved`, or a bundled copy
     * (`inBundle`): npm audit reports a bundled copy under its own name, but the
     * saved list records top-level versions only, so a bundled version that
     * changed after the last refresh would otherwise read as checked.
     */
    readonly verifiable: boolean;
    /**
     * The declared alias's registry target and version, when the top-level copy
     * is one. `sole` says it is the only copy under this name, so nothing else
     * here can speak for the name itself.
     */
    readonly aliasOf?: AliasRecord & {
        readonly sole: boolean;
    };
}
/**
 * Every package a lockfile installs, by the folder name a manifest uses. Names
 * and versions are kept as written, valid or not, so a caller can name what it
 * cannot check instead of dropping it. Null when it is not a lockfile.
 */
export declare function lockInstalls(raw: unknown, registry?: RegistryBinding, aliases?: ReadonlyMap<string, string>): Map<string, Install> | null;
/** A workspace file read through one handle within the cap, or null. */
export declare function readWorkspaceText(path: string): Promise<string | null>;
export declare const snapshotPath: (ws: string) => string;
export declare function writeAdvisorySnapshot(ws: string, snapshot: AdvisorySnapshot): Promise<void>;
export declare function readAdvisorySnapshot(ws: string, now?: Date): Promise<SnapshotRead>;
export declare function toDepAdvisory(snapshot: AdvisorySnapshot): DepAdvisory;
/** Whole days since the snapshot was taken; a date slightly in the future counts as today. */
export declare function ageInDays(snapshot: AdvisorySnapshot, now: Date): number;
export {};
//# sourceMappingURL=advisories.d.ts.map