// `security refresh`: the one opt-in step that uses the network. It runs
// `npm audit --json` and saves the result, with the audited lockfile versions,
// as the list the scan reads. It lives in the CLI layer, which the engine may
// not import (.3c/architecture.yaml), so the scan cannot reach this spawn.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { lockVersions, parseNpmAudit, readWorkspaceFile, SEMVER, writeAdvisorySnapshot } from "../security/advisories.js";
const ARGS = { version: ["--version"], audit: ["audit", "--json"] };
const NPM_TIMEOUT_MS = 120_000;
const NPM_MAX_BUFFER = 32 * 1024 * 1024;
/**
 * How npm is started, never through a shell. On Windows `npm` is a `.cmd` shim
 * that only cmd.exe can run, and cmd.exe looks in the working directory (the
 * workspace being audited) before PATH, so a planted `npm.cmd` there would run
 * (CWE-427). Instead npm's own script is run with this Node, from the
 * installation next to it or the per-user global prefix. Elsewhere, execvp
 * searches PATH only.
 */
export function npmInvocation(platform, execPath, appData, exists = existsSync) {
    if (platform !== "win32")
        return { file: "npm", prefix: [] };
    const script = ["node_modules", "npm", "bin", "npm-cli.js"];
    const candidates = [join(dirname(execPath), ...script), ...(appData ? [join(appData, "npm", ...script)] : [])];
    const found = candidates.find(exists);
    return found === undefined ? null : { file: execPath, prefix: [found] };
}
export const npmArgv = (how, command) => [...how.prefix, ...ARGS[command]];
/**
 * The environment is inherited on purpose: npm reads the developer's own
 * registry, proxy and auth settings from it. The project's `.npmrc` is never
 * in reach, because the audit runs in a folder `refreshAdvisories` creates.
 */
export const defaultNpmRunner = (command, cwd) => new Promise((resolve) => {
    const how = npmInvocation(process.platform, process.execPath, process.env["APPDATA"]);
    if (how === null) {
        resolve({ code: -1, stdout: "" });
        return;
    }
    execFile(how.file, npmArgv(how, command), { cwd, timeout: NPM_TIMEOUT_MS, maxBuffer: NPM_MAX_BUFFER, windowsHide: true, encoding: "utf8" }, (err, stdout) => resolve({ code: err === null ? 0 : typeof err.code === "number" ? err.code : -1, stdout }));
});
/** Why a workspace file cannot be used, in the words a refusal gives. */
function unusable(name, r, missing) {
    if (r.kind === "absent")
        return missing;
    if (r.kind === "too-large")
        return `${name} is larger than 16 MiB, so it cannot be audited`;
    return `${name} cannot be read (it may be a link or a folder), so check the file and try again`;
}
/**
 * npm audits copies of package.json and its lockfile in a fresh temporary
 * folder, never the workspace. A workspace `.npmrc` could otherwise point the
 * audit at a registry that answers "clean", or expand a token into a request
 * to a host it names; in the copy, only the developer's own npm settings apply.
 * The versions recorded as audited come from the same bytes npm read, so a
 * lockfile edited while the audit runs cannot be recorded as audited. When
 * npm-shrinkwrap.json exists it is the lockfile, as npm itself prefers it.
 */
export async function refreshAdvisories(ws, run = defaultNpmRunner, now = new Date()) {
    const manifest = await readWorkspaceFile(join(ws, "package.json"));
    if (manifest.kind !== "read") {
        return { kind: "refused", reason: unusable("package.json", manifest, "there is no package.json here, so run the command from your project's root folder") };
    }
    const shrinkwrap = await readWorkspaceFile(join(ws, "npm-shrinkwrap.json"));
    const lockName = shrinkwrap.kind === "absent" ? "package-lock.json" : "npm-shrinkwrap.json";
    const lock = shrinkwrap.kind === "absent" ? await readWorkspaceFile(join(ws, lockName)) : shrinkwrap;
    if (lock.kind !== "read") {
        return { kind: "refused", reason: unusable(lockName, lock, "npm audit needs a package-lock.json, so run `npm install` first") };
    }
    const audited = lockVersions(lock.text);
    if (audited === null) {
        return { kind: "refused", reason: `${lockName} is not a version 2 or 3 lockfile, or lists more than 20,000 packages, so update it with npm 7 or later` };
    }
    const dir = await mkdtemp(join(tmpdir(), "3c-audit-"));
    try {
        await writeFile(join(dir, "package.json"), manifest.text, { encoding: "utf8", flag: "wx" });
        await writeFile(join(dir, lockName), lock.text, { encoding: "utf8", flag: "wx" });
        const version = await run("version", dir);
        const npmVersion = version.stdout.trim();
        if (version.code !== 0 || !SEMVER.test(npmVersion)) {
            return { kind: "refused", reason: "npm could not be started, so check that Node.js and npm are installed" };
        }
        // npm audit exits 1 when it finds a vulnerability, so the exit code says
        // nothing about whether the report is usable; the report itself does.
        const parsed = parseNpmAudit((await run("audit", dir)).stdout);
        if (parsed.kind === "refused")
            return parsed;
        await writeAdvisorySnapshot(ws, { schema: 1, source: "npm audit", npmVersion, generatedAt: now.toISOString(), audited, advisories: parsed.advisories });
        return { kind: "written", count: Object.keys(parsed.advisories).length };
    }
    finally {
        // A folder Windows still holds open must not replace the result.
        await rm(dir, { recursive: true, force: true }).catch(() => { });
    }
}
//# sourceMappingURL=security-refresh.js.map