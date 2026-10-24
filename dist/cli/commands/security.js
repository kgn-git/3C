import { loadDynamicContext } from "../../context/loader.js";
import { runSecurityGate } from "../../security/index.js";
import { refreshAdvisories } from "../security-refresh.js";
import { addSuppression } from "../../security/suppress.js";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { isSafeRef } from "../../skills/test/select.js";
// Pre-commit security scan gate, recorded suppressions, and the advisory refresh.
export async function securityCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "scan") {
        // Deny-by-default on arguments, matching `test select` (which validates the
        // identical `--base=` shape through `isSafeRef` and rejects anything it does
        // not recognise). Without this, `security scan --base main` (space form)
        // or `--bse=main` would scan the auto-detected span and report a pass,
        // looking identical to the narrowed run the operator asked for — a silent
        // fail-open.
        let base;
        for (const a of argv.slice(1)) {
            if (!a.startsWith("--base=")) {
                log(`Unrecognised argument: ${a}\nUsage: security scan [--base=<ref>]`);
                return 1;
            }
            base = a.slice("--base=".length);
        }
        // CWE-88: git reads a leading `-` as an option, not a ref, so an unvalidated
        // value silently changes which span is scanned.
        if (base !== undefined && !isSafeRef(base)) {
            log(`Invalid --base ref: ${base}\nUsage: security scan [--base=<ref>]`);
            return 1;
        }
        const r = await runSecurityGate(env.cwd, {
            ...(env.scanner ? { scanner: env.scanner } : {}),
            // NOT `env.runner ? … : undefined` on the dependency half: the CLI never
            // injects a runner, so that shape would run the A03 supply-chain check
            // only under test. Omitted, the gate's default runner applies on both
            // halves.
            ...(env.runner ? { runner: env.runner } : {}),
            ...(base !== undefined ? { base } : {}),
        });
        log(r.message);
        return r.blocked ? 2 : 0;
    }
    if (sub === "suppress") {
        const id = argv[1];
        let reason;
        for (const a of argv.slice(2)) {
            if (a.startsWith("--reason="))
                reason = a.slice("--reason=".length);
        }
        if (!id || !reason) {
            log('Usage: security suppress <id> --reason="<why>"');
            return 1;
        }
        await addSuppression(env.cwd, id, reason);
        log(`Suppressed ${id} — recorded: ${reason}`);
        return 0;
    }
    if (sub === "refresh") {
        if (argv.length > 1) {
            // JSON-quoted, so control characters in the argument print as escapes.
            log(`Unrecognised argument: ${JSON.stringify(argv[1])}\nUsage: security refresh`);
            return 1;
        }
        const slug = resolveBrandSlugSync();
        const r = await refreshAdvisories(env.cwd, env.npm);
        if (r.kind === "refused") {
            log(`The saved advisory list was not updated: ${r.reason}.\n` +
                `Any list saved before is unchanged. Then run \`${slug} security refresh\` again.`);
            return 1;
        }
        log(`Advisory list saved: npm audit reports ${r.count} vulnerable ${r.count === 1 ? "package" : "packages"}.\n` +
            `\`${slug} security scan\` reads it offline. Run \`${slug} security refresh\` again when your dependencies change; until then, added dependencies are reported as not checked, and that blocks nothing.`);
        return 0;
    }
    log("Usage: security <scan|suppress|refresh>");
    return 1;
}
// Inspect the dynamically-loaded context for a file.
export async function debugCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    if (argv[0] !== "context") {
        log("Usage: debug context [file]");
        return 1;
    }
    const file = argv[1] ?? env.cwd;
    const c = await loadDynamicContext(env.cwd, file);
    log(`Active rules (${c.rules.length}):`);
    for (const r of c.rules)
        log(`  - ${r.filename}`);
    log(`Instruction count: ${c.instructionCount} / 150`);
    log(`Remaining budget: ${c.remainingBudget}`);
    if (c.debugLog.length > 0) {
        log("Budget drops:");
        for (const d of c.debugLog)
            log(`  ${d}`);
    }
    return 0;
}
//# sourceMappingURL=security.js.map