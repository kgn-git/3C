import { matchAny } from "../rules/glob-match.js";
import { resolveBrandSlugSync } from "../branding/runtime.js";
export function evaluateCoverageGate(input) {
    const { coverage, changes, config } = input;
    const uncovered = [];
    let total = 0;
    let covered = 0;
    for (const ch of changes) {
        const file = ch.file.replace(/\\/g, "/");
        if (config.exempt.length > 0 && matchAny([...config.exempt], [file])) {
            continue;
        }
        const hit = coverage.get(file);
        for (const line of [...new Set(ch.lines)]) {
            total++;
            if (hit && hit.has(line))
                covered++;
            else
                uncovered.push({ file, line });
        }
    }
    const coveragePct = total === 0 ? 100 : Math.round((covered / total) * 100);
    const blocked = coveragePct < config.minLines;
    const slug = resolveBrandSlugSync();
    const message = blocked
        ? `Coverage gate: changed-line coverage ${coveragePct}% is below the ${config.minLines}% threshold.\n` +
            `Uncovered:\n` +
            uncovered.map((u) => `  - ${u.file}:${u.line}`).join("\n") +
            `\nRun \`${slug} test\` to generate the missing tests, then retry.\n`
        : "";
    return { blocked, coveragePct, uncovered, message };
}
//# sourceMappingURL=gate.js.map