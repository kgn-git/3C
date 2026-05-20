// #12 AC1/AC2: pre-flight gate. Branch sync is checked via git; tests and
// unresolved-reviews are team-configured commands (exit 0 = pass). An
// unconfigured optional check is not-applicable (cannot "fail").
async function behindUpstream(git) {
    try {
        // commits on upstream not in HEAD; "" / error ⇒ no upstream ⇒ skip
        const out = await git(["rev-list", "--count", "HEAD..@{u}"]);
        const n = Number.parseInt(out.trim(), 10);
        return Number.isFinite(n) && n > 0;
    }
    catch {
        return false;
    }
}
export async function preflight(cfg, deps) {
    const failed = [];
    if (await behindUpstream(deps.gitRunner))
        failed.push("branch-behind");
    if (cfg.checks.tests) {
        const r = await deps.runner(cfg.checks.tests);
        if (r.exitCode !== 0)
            failed.push("tests");
    }
    if (cfg.checks.reviews) {
        const r = await deps.runner(cfg.checks.reviews);
        if (r.exitCode !== 0)
            failed.push("unresolved-reviews");
    }
    return { ok: failed.length === 0, failed };
}
//# sourceMappingURL=preflight.js.map