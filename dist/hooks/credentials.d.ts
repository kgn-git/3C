export type SecretResolver = (name: string) => Promise<string | null>;
/** The subset of `execFile` the resolver uses, injectable for tests. */
export type ExecFn = (file: string, args: ReadonlyArray<string>, opts?: {
    readonly env?: NodeJS.ProcessEnv;
}) => Promise<{
    readonly stdout: string;
}>;
export interface ResolverDeps {
    readonly platform?: NodeJS.Platform;
    readonly exec?: ExecFn;
    /** macOS account name; defaults to the OS user. */
    readonly user?: string;
}
/** True when `name` can be looked up at all; the caller reports a bad name as such, not as a miss. */
export declare function isValidCredentialName(name: string): boolean;
/** Where `name` must be stored on `platform`, for the user-facing refusal. */
export declare function credentialStoreName(platform: NodeJS.Platform): string;
/** How the resolver looks `name` up on `platform`, so the user stores it in a form it can find. */
export declare function credentialLookupHint(platform: NodeJS.Platform, name: string): string;
/** A resolver over the OS credential store, with its platform and exec injectable for tests. */
export declare function makeResolver(deps?: ResolverDeps): SecretResolver;
export declare const defaultResolver: SecretResolver;
//# sourceMappingURL=credentials.d.ts.map