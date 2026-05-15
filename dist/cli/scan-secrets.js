import { scanSecrets } from "../validate/secrets.js";
export function scanSecretsCli(input) {
    const result = scanSecrets(input);
    return { exitCode: 0, output: JSON.stringify(result) + "\n" };
}
//# sourceMappingURL=scan-secrets.js.map