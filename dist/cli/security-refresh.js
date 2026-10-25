// `security refresh`: the one opt-in step that uses the network. It runs
// `npm audit --json` and saves the result, with the audited lockfile versions,
// as the list the scan reads. It lives in the CLI layer, which the engine may
// not import (.3c/architecture.yaml), so the scan cannot reach this spawn.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bindRegistry, lockVersions, MAX_ENTRIES, MAX_SNAPSHOT_BYTES, parseNpmAudit, readWorkspaceFile, registryBase, SEMVER, writeAdvisorySnapshot } from "../security/advisories.js";
// `config get registry` prints that one setting. A token sits under its own
// key, so it is never asked for and never printed.
const ARGS = { version: ["--version"], registry: ["config", "get", "registry"], audit: ["audit", "--json"] };
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
        return `${name} is larger than ${MAX_SNAPSHOT_BYTES / 1024 / 1024} MiB, so it cannot be audited`;
    return `${name} cannot be read (it may be a link or a folder), so check the file and try again`;
}
export async function refreshAdvisories(ws, run = defaultNpmRunner, now = new Date(), opts = {}) {
    const remove = opts.remove ?? ((dir) => rm(dir, { recursive: true, force: true }));
    const warn = opts.warn ?? ((m) => void process.stderr.write(`${m}
`));
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
    if (lockVersions(lock.text) === null) {
        return { kind: "refused", reason: `${lockName} is not a version 2 or 3 lockfile, or lists more than ${MAX_ENTRIES.toLocaleString("en-GB")} packages, so update it with npm 7 or later` };
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
        const reg = await run("registry", dir);
        const base = reg.code === 0 ? registryBase(reg.stdout) : null;
        const registry = base === null ? null : bindRegistry(base);
        if (registry === null) {
            return { kind: "refused", reason: "npm did not report the registry it installs from, so run `npm config get registry` to see why" };
        }
        // The audited versions come from the same bytes npm read, from that registry only.
        const audited = lockVersions(lock.text, registry) ?? {};
        // npm audit exits 1 when it finds a vulnerability, so the exit code says
        // nothing about whether the report is usable; the report itself does.
        const parsed = parseNpmAudit((await run("audit", dir)).stdout);
        if (parsed.kind === "refused")
            return parsed;
        await writeAdvisorySnapshot(ws, { schema: 2, source: "npm audit", npmVersion, registry, generatedAt: now.toISOString(), audited, advisories: parsed.advisories });
        return { kind: "written", count: Object.keys(parsed.advisories).length };
    }
    finally {
        // A folder Windows still holds open must not replace the result, but it is named.
        await remove(dir).catch(() => warn(`The temporary folder ${dir} could not be removed. Delete it when nothing is using it. This blocks nothing.`));
    }
}
//# sourceMappingURL=security-refresh.js.map