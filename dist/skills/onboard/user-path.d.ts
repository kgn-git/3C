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
export declare function isSafeUser(name: string): boolean;
/**
 * The OS account name made safe, for the default only: a developer must not be
 * refused for the name their machine gave them. A typed `--user` is refused
 * instead, since normalising it could map two people onto one file.
 */
export declare function normaliseDefaultUser(raw: string): string;
/**
 * The file an onboarding record for `user` lives in. Throws
 * `OnboardPathError("invalid-user")` for an unsafe name, and re-checks
 * containment after resolution.
 */
export declare function onboardingFile(ws: string, user: string, sub?: string): string;
/**
 * Layer 2: `dir/name` must resolve to a direct child of `dir`. Exported for
 * direct tests, since the allow-list makes it unreachable via `onboardingFile`.
 */
export declare function containedFile(dir: string, name: string): string;
/** A progress record is a few hundred bytes; anything this size is not one. */
export declare const MAX_RECORD_BYTES: number;
/**
 * `user`'s record, or `null` when nothing is safe to read (a FIFO would block
 * forever). Never throws: corrupt or missing means fresh.
 */
export declare function readOnboardingFile(ws: string, user: string): Promise<string | null>;
export declare function anyLinked(ws: string, user: string, sub?: string): Promise<boolean>;
/** Is the onboarding directory itself reached through a link? (The dashboard's question.) */
export declare function onboardingDirLinked(ws: string): Promise<boolean>;
/**
 * Write `content` as `user`'s record, refusing an unsafe name or a link
 * anywhere on the path, and never writing through a link at the file itself.
 */
export declare function writeOnboardingFile(ws: string, user: string, content: string, sub?: string): Promise<void>;
//# sourceMappingURL=user-path.d.ts.map