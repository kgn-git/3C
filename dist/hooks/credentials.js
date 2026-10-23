// Resolves a named credential from the OS credential store — and nowhere else
// (NFR-SEC-06, AD-08):
//   - macOS: Keychain, via `security find-generic-password`
//   - Linux: Secret Service, via `secret-tool lookup`
//   - Windows: Credential Manager, via powershell.exe and the Win32 CredReadW
//     API (reads the generic credential `cmdkey /generic:<name>` writes)
// A miss is a miss: there is no environment-variable fallback, on any
// platform, so "the keychain is the only credential boundary" holds. The
// caller refuses and tells the user to store the credential first.
//
// Its one consumer is `create-issue` to Jira / Linear / GitLab
// (src/mcp/pm/registry.ts). Hook commands may not reference credentials as
// `${OS_KEYCHAIN:NAME}` (the orchestrator refuses them): the value would be
// substituted into the hook's argv, where the process list exposes it.
import { execFile } from "node:child_process";
import { userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
// A locked keyring can prompt and wait; the caller fails closed instead.
const LOOKUP_TIMEOUT_MS = 15_000;
// Entry names reach a child process (as an argument on macOS/Linux, through
// the environment on Windows), so they are allow-listed first. The default
// PM entry is `<slug>-pm-<tool>-token`.
const SAFE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
/** True when `name` can be looked up at all; the caller reports a bad name as such, not as a miss. */
export function isValidCredentialName(name) {
    return SAFE_NAME.test(name);
}
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
// The target name arrives in $env:THREEC_CRED_TARGET — never in the script
// text or argv — and the value leaves base64-encoded on stdout, so it survives
// the console code page byte for byte. Exit 2: no such credential.
const WINDOWS_SCRIPT = `
$ErrorActionPreference = 'Stop'
$t = $env:THREEC_CRED_TARGET
if (-not $t) { exit 3 }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ThreeCCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool CredReadW(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr cred);
  public static string Read(string target) {
    IntPtr p;
    if (!CredReadW(target, 1, 0, out p)) return null;
    try {
      CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
      if (c.CredentialBlobSize == 0) return "";
      // cmdkey stores UTF-16; an odd size is not a credential we can read.
      if (c.CredentialBlobSize % 2 != 0) return null;
      return Marshal.PtrToStringUni(c.CredentialBlob, c.CredentialBlobSize / 2);
    } finally { CredFree(p); }
  }
}
'@
$v = [ThreeCCred]::Read($t)
if ($null -eq $v) { exit 2 }
[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($v)))
`;
const nodeExec = async (file, args, opts) => {
    const { stdout } = await promisify(execFile)(file, [...args], {
        ...(opts?.env !== undefined ? { env: opts.env } : {}),
        windowsHide: true,
        timeout: LOOKUP_TIMEOUT_MS,
    });
    return { stdout };
};
/** The absolute Windows PowerShell, so a PATH entry cannot stand in for it. */
function windowsPowerShell() {
    const root = process.env.SystemRoot ?? "C:\\Windows";
    return join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}
/** Only what powershell.exe and Add-Type need — not the whole parent environment. */
function windowsChildEnv(name) {
    const env = { THREEC_CRED_TARGET: name };
    for (const k of ["SystemRoot", "windir", "PATH", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA"]) {
        const v = process.env[k];
        if (v !== undefined)
            env[k] = v;
    }
    return env;
}
/** Where `name` must be stored on `platform`, for the user-facing refusal. */
export function credentialStoreName(platform) {
    if (platform === "darwin")
        return "macOS Keychain";
    if (platform === "linux")
        return "Secret Service (secret-tool)";
    if (platform === "win32")
        return "Windows Credential Manager";
    return "OS credential store";
}
/** How the resolver looks `name` up on `platform`, so the user stores it in a form it can find. */
export function credentialLookupHint(platform, name) {
    if (platform === "darwin")
        return `a generic password with service "${name}" for your account`;
    if (platform === "linux")
        return `an item with attribute name=${name}`;
    if (platform === "win32")
        return `a generic credential named "${name}"`;
    return `an entry named "${name}"`;
}
/** A resolver over the OS credential store, with its platform and exec injectable for tests. */
export function makeResolver(deps = {}) {
    const platform = deps.platform ?? process.platform;
    const exec = deps.exec ?? nodeExec;
    return async (name) => {
        if (!SAFE_NAME.test(name))
            return null;
        try {
            let value;
            if (platform === "darwin") {
                const user = deps.user ?? userInfo().username;
                value = (await exec("security", ["find-generic-password", "-a", user, "-s", name, "-w"])).stdout.trim();
            }
            else if (platform === "linux") {
                value = (await exec("secret-tool", ["lookup", "name", name])).stdout.trim();
            }
            else if (platform === "win32") {
                const { stdout } = await exec(windowsPowerShell(), ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_SCRIPT], { env: windowsChildEnv(name) });
                // Anything but clean base64 (a stray warning on stdout) is not a credential.
                const encoded = stdout.trim();
                if (!BASE64.test(encoded))
                    return null;
                value = Buffer.from(encoded, "base64").toString("utf8");
            }
            else {
                return null;
            }
            return value === "" ? null : value;
        }
        catch {
            // Not found, store unavailable or locked: all fail closed.
            return null;
        }
    };
}
export const defaultResolver = makeResolver();
//# sourceMappingURL=credentials.js.map