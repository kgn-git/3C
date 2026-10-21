export interface ScanSecretsCliResult {
    readonly exitCode: 0 | 1;
    readonly output: string;
}
/**
 * #408 AC7/AC8. The exit code was the literal type `0` — a positive detection
 * and a clean scan were indistinguishable to any caller gating on `$?`, and
 * `/3c-test` told the model to "abort if there are hits".
 *
 * A failing exit is OPT-IN rather than the default, because the flag has three
 * shipped consumers and they do not want the same thing: `/3c-review` step 5
 * and `/3c-implement` step 2 read the JSON to redact findings and then CONTINUE
 * (`If scan-secrets returns an empty hits array, emit the finding verbatim`).
 * Flipping the default would silently convert both of those into aborts.
 *
 * The JSON is emitted either way, so a caller can gate on the exit code and
 * still read the payload.
 */
export declare function scanSecretsCli(input: string, argv?: readonly string[]): ScanSecretsCliResult;
//# sourceMappingURL=scan-secrets.d.ts.map