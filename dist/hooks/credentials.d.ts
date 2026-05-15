export type SecretResolver = (name: string) => Promise<string | null>;
export type ResolveResult = {
    readonly ok: true;
    readonly value: string;
} | {
    readonly ok: false;
    readonly missing: ReadonlyArray<string>;
};
export declare function resolveCredentials(text: string, resolver?: SecretResolver): Promise<ResolveResult>;
export declare const defaultResolver: SecretResolver;
//# sourceMappingURL=credentials.d.ts.map