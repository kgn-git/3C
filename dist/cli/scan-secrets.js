import { scanSecrets } from "../validate/secrets.js";
/**
 * A failing exit is opt-in: `/3c-review` and `/3c-implement` read the JSON to
 * redact and then continue, so a failing default would turn them into aborts.
 * JSON is emitted either way.
 */
export function scanSecretsCli(input, argv = []) {
    const result = scanSecrets(input);
    const failOnHit = argv.includes("--fail-on-hit");
    return {
        exitCode: failOnHit && result.hits.length > 0 ? 1 : 0,
        output: JSON.stringify(result) + "\n",
    };
}
//# sourceMappingURL=scan-secrets.js.map