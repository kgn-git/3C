// AC9 (security): network-default-deny. Wraps hook commands with
// platform-appropriate network isolation when `network: false`.
//
// L1 isolation:
//   - Linux: `unshare -rn sh -c <command>` — drops network namespace,
//     `-r` maps current user to root in the new namespace so no sudo.
//   - macOS / Windows: best-effort (no isolation); warning is emitted
//     for visibility. Strong sandboxing on those platforms is L2.
export function buildIsolatedCommand(opts) {
    const platform = opts.platform ?? process.platform;
    // Allow-list: command runs unmodified.
    if (opts.network) {
        return { executable: "sh", args: ["-c", opts.command] };
    }
    // Deny-list with platform-specific enforcement.
    if (platform === "linux") {
        return {
            executable: "unshare",
            args: ["-rn", "sh", "-c", opts.command],
        };
    }
    const which = platform === "darwin" ? "macOS" : "Windows";
    return {
        executable: "sh",
        args: ["-c", opts.command],
        platformWarning: `network isolation on ${which} is best-effort at L1 — strong sandboxing arrives at L2`,
    };
}
//# sourceMappingURL=network-isolate.js.map