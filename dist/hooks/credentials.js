// Resolves `${OS_KEYCHAIN:NAME}` references in hook commands.
// L1 implementation:
//   1. Try platform-specific OS keychain (macOS: `security`; Linux: `secret-tool`)
//   2. Fall back to process.env[NAME] if the keychain lookup fails
//   3. Report missing names so the caller can fail loudly (NFR-USE-03)
//
// Per AD-08, credentials never travel through hooks.yaml in plaintext.
// This resolver is invoked at hook execution time only.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const REFERENCE = /\$\{OS_KEYCHAIN:([A-Za-z0-9_]+)\}/g;
export async function resolveCredentials(text, resolver = defaultResolver) {
    const names = new Set();
    for (const match of text.matchAll(REFERENCE)) {
        if (match[1])
            names.add(match[1]);
    }
    if (names.size === 0)
        return { ok: true, value: text };
    const resolved = new Map();
    const missing = [];
    for (const name of names) {
        const v = await resolver(name);
        if (v === null)
            missing.push(name);
        else
            resolved.set(name, v);
    }
    if (missing.length > 0)
        return { ok: false, missing };
    const value = text.replace(REFERENCE, (_full, name) => resolved.get(name) ?? "");
    return { ok: true, value };
}
export const defaultResolver = async (name) => {
    // 1. Try OS keychain.
    try {
        if (process.platform === "darwin") {
            const user = process.env.USER ?? "";
            const { stdout } = await exec("security", [
                "find-generic-password",
                "-a",
                user,
                "-s",
                name,
                "-w",
            ]);
            const v = stdout.trim();
            if (v !== "")
                return v;
        }
        else if (process.platform === "linux") {
            const { stdout } = await exec("secret-tool", ["lookup", "name", name]);
            const v = stdout.trim();
            if (v !== "")
                return v;
        }
        // Windows: native cmdkey doesn't expose the value; rely on env fallback.
    }
    catch {
        // keychain miss — fall through to env fallback
    }
    // 2. Env-var fallback (also useful for CI and tests).
    const envVal = process.env[name];
    if (envVal !== undefined && envVal !== "")
        return envVal;
    return null;
};
//# sourceMappingURL=credentials.js.map