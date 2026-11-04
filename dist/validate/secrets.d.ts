export interface Detector {
    readonly type: SecretType;
    readonly pattern: RegExp;
    /**
     * For a pattern that reads a whole run of characters from every start inside it: where an attempt may begin, and
     * the characters of the run (only the sources are used; the scan sets the flags). An attempt that fails has read to
     * the end of its run, and so would every later start in that run, so the scan resumes after the run.
     */
    readonly run?: {
        readonly starts: RegExp;
        readonly chars: RegExp;
    };
}
export type SecretType = "aws-access-key" | "github-pat" | "jwt" | "private-ip" | "public-ip" | "internal-hostname" | "stripe-key" | "pem-block" | "db-connection-string" | "github-app-token" | "ai-api-key" | "slack-token" | "google-api-key" | "bearer-token";
export interface SecretMatch {
    readonly type: SecretType;
    readonly match: string;
    readonly redacted: string;
    /** Offset of the match in the scanned text (the true line is derived from it). */
    readonly index: number;
}
export interface SecretScanResult {
    readonly hits: ReadonlyArray<SecretMatch>;
}
export declare const DETECTORS: ReadonlyArray<Detector>;
export declare function redactMatch(value: string): string;
export declare function scanSecrets(text: string): SecretScanResult;
export declare const NETWORK_IDENTIFIER_TYPES: ReadonlySet<SecretType>;
//# sourceMappingURL=secrets.d.ts.map