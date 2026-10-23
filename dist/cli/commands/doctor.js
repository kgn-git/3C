import { runDoctor } from "../../skills/doctor.js";
import { PACKAGE_ROOT } from "../shared.js";
// Read-only install & wiring diagnostic. Exit 1 on a blocking issue.
export async function doctorCommand() {
    const report = await runDoctor({
        workspaceDir: process.cwd(),
        packageRoot: PACKAGE_ROOT,
    });
    for (const f of report.findings) {
        const icon = f.level === "ok" ? "✓" : f.level === "warn" ? "⚠" : "✗";
        console.log(`${icon} [${f.check}] ${f.message}`);
    }
    console.log(report.ok
        ? "\n✓ doctor: no blocking issues."
        : "\n✗ doctor: blocking issue(s) found — see ✗ above.");
    return report.ok ? 0 : 1;
}
//# sourceMappingURL=doctor.js.map