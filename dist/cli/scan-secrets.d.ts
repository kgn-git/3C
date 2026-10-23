export interface ScanSecretsCliResult {
    readonly exitCode: 0 | 1;
    readonly output: string;
}
/**
 * A failing exit is opt-in: `/3c-review` and `/3c-implement` read the JSON to
 * redact and then continue, so a failing default would turn them into aborts.
 * JSON is emitted either way.
 */
export declare function scanSecretsCli(input: string, argv?: readonly string[]): ScanSecretsCliResult;
//# sourceMappingURL=scan-secrets.d.ts.map