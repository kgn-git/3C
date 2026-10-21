/** Why an onboarding path was refused. Never carries the offending value. */
export type OnboardPathRefusal = "invalid-user" | "linked-path";
/**
 * Thrown by the writers. The message is generic on purpose (A10 / CWE-117):
 * the caller logs it, and a refused name is exactly the value not to echo.
 */
export declare class OnboardPathError extends Error {
    readonly kind: OnboardPathRefusal;
    readonly name = "OnboardPathError";
    constructor(kind: OnboardPathRefusal);
}
/** The name used when the OS account name normalises to nothing usable. */
export declare const FALLBACK_USER = "developer";
/** Is `name` usable verbatim as an onboarding file stem? */
export declare function isSafeUser(name: string): boolean;
/**
 * The OS account name made safe — for the DEFAULT only (AC4).
 *
 * A developer who never typed a name must not be refused for the one their
 * machine gave them (`DOMAIN\jsmith`, `j smith`). An explicit `--user` is NOT
 * passed through here: normalising a typed name would silently map two people
 * onto one file, so it is validated and refused instead.
 */
export declare function normaliseDefaultUser(raw: string): string;
/**
 * The file an onboarding record for `user` lives in. Throws
 * `OnboardPathError("invalid-user")` for an unsafe name, and re-checks
 * containment after resolution.
 */
export declare function onboardingFile(ws: string, user: string, sub?: string): string;
/**
 * Layer 2 on its own: `dir/name` resolved, then confirmed to be a direct child
 * of `dir`. Exported so it is tested directly — through `onboardingFile` the
 * allow-list makes it unreachable, which is the point of a second layer and
 * also why a test through the public API cannot prove it works.
 */
export declare function containedFile(dir: string, name: string): string;
/** A progress record is a few hundred bytes; anything this size is not one. */
export declare const MAX_RECORD_BYTES: number;
/**
 * Read `user`'s record, or `null` when there is nothing safe to read: an unsafe
 * name, a link anywhere on the path, a target that is not a regular file (a
 * FIFO would block forever), a hard-linked file, or one over the size cap.
 * Never throws — the reader's contract is "corrupt or missing → fresh".
 */
export declare function readOnboardingFile(ws: string, user: string): Promise<string | null>;
/** Does any directory on the chain, or the file itself, resolve through a link? */
export declare function anyLinked(ws: string, user: string, sub?: string): Promise<boolean>;
/** Is the onboarding directory itself reached through a link? (The dashboard's question.) */
export declare function onboardingDirLinked(ws: string): Promise<boolean>;
/**
 * Write `content` as `user`'s record, refusing an unsafe name or a link
 * anywhere on the path, and never writing through a link at the file itself.
 */
export declare function writeOnboardingFile(ws: string, user: string, content: string, sub?: string): Promise<void>;
//# sourceMappingURL=user-path.d.ts.map