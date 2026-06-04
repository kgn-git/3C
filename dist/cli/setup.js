// #280 — `setup` one-shot installer orchestrator. Sequences existing command
// wrappers (each returns an exit code) with fail-fast + a resume hint.
export async function runSetup(steps, log = () => { }) {
    const completed = [];
    const total = steps.length;
    for (let i = 0; i < total; i++) {
        const s = steps[i];
        log(`\n▶ [${i + 1}/${total}] ${s.name}`);
        let code;
        try {
            code = await s.run();
        }
        catch (e) {
            log(`✗ ${s.name}: ${e.message}`);
            code = 1;
        }
        if (code !== 0) {
            log(`\n✗ setup stopped at "${s.name}" — completed ${completed.length} of ${total}. Fix the error and re-run \`setup\` to resume (completed steps are idempotent).`);
            return { completed, total, failedAt: { step: s.name, code } };
        }
        completed.push(s.name);
    }
    log(`\n✓ setup complete — ${completed.length} of ${total} steps done. Run \`doctor\` anytime to re-check.`);
    return { completed, total };
}
//# sourceMappingURL=setup.js.map