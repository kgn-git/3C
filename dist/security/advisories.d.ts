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
    readonly schema: 1;
    readonly source: "npm audit";
    readonly npmVersion: string;
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
    kind: "invalid";
} | {
    kind: "found";
    snapshot: AdvisorySnapshot;
};
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
 * is refused: by lstat on every platform, and by O_NOFOLLOW at the open where
 * the platform has it, so a link swapped in between is refused too (CWE-59).
 */
export declare function readWorkspaceFile(path: string, max?: number): Promise<WorkspaceRead>;
/** The version of each top-level registry package a lockfile text holds, or null when it is not a lockfile. */
export declare function lockVersions(text: string): Record<string, string> | null;
export interface Install {
    /** Each version installed under this name, at any depth. */
    readonly versions: readonly string[];
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
export declare function lockInstalls(raw: unknown): Map<string, Install> | null;
/** A workspace file read through one handle within the cap, or null. */
export declare function readWorkspaceText(path: string): Promise<string | null>;
export declare const snapshotPath: (ws: string) => string;
export declare function writeAdvisorySnapshot(ws: string, snapshot: AdvisorySnapshot): Promise<void>;
export declare function readAdvisorySnapshot(ws: string, now?: Date): Promise<SnapshotRead>;
export declare function toDepAdvisory(snapshot: AdvisorySnapshot): DepAdvisory;
/** Whole days since the snapshot was taken; a date slightly in the future counts as today. */
export declare function ageInDays(snapshot: AdvisorySnapshot, now: Date): number;
//# sourceMappingURL=advisories.d.ts.map