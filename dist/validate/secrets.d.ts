export type SecretType = "aws-access-key" | "github-pat" | "jwt" | "private-ip" | "public-ip" | "internal-hostname" | "stripe-key" | "pem-block" | "db-connection-string";
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
export declare function scanSecrets(text: string): SecretScanResult;
//# sourceMappingURL=secrets.d.ts.map