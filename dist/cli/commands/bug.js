import { runBugReport } from "../../skills/bug/index.js";
function bugFlag(argv, name) {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
}
// Structured bug report filed via the create-issue path.
export async function bugCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const attachments = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--attach" && argv[i + 1])
            attachments.push(argv[i + 1]);
    }
    const input = {
        summary: bugFlag(argv, "--summary"),
        reproSteps: bugFlag(argv, "--repro"),
        expected: bugFlag(argv, "--expected"),
        actual: bugFlag(argv, "--actual"),
        environment: bugFlag(argv, "--env"),
        severity: bugFlag(argv, "--severity"),
        suspectedRootCause: bugFlag(argv, "--root-cause"),
        attachments,
    };
    const r = await runBugReport(input, env.cwd, env.spawn ? { spawn: env.spawn } : {});
    if (!r.filed) {
        if (r.missing)
            log(`Missing required: ${r.missing.join(", ")}`);
        else
            log(`Bug report not filed${r.warnings?.length ? " (preflight warnings)" : ""}.`);
        return 1;
    }
    log(`Filed: ${r.ref?.url ?? "(ok)"}`);
    return 0;
}
//# sourceMappingURL=bug.js.map