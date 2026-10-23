import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { detectFramework } from "../../skills/test/detect-framework.js";
import { isSafeRef, loadTestMap, selectTests, selectionCommands } from "../../skills/test/select.js";
import { writeTest } from "../../skills/test/write.js";
import { readBoundedStdin } from "../read-input.js";
/**
 * Changed paths for selection: working tree vs `base` (default HEAD), plus
 * untracked. Returns `undefined` when git ITSELF failed — which is not the same
 * as "nothing changed", and must not be allowed to look like it. Collapsing the
 * two is how a loop ends up running zero tests and reading it as success.
 */
async function changedPaths(cwd, base) {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    let failed = false;
    const run = async (args) => {
        try {
            const { stdout } = await promisify(execFile)("git", args, { cwd, maxBuffer: 8 * 1024 * 1024 });
            return stdout;
        }
        catch {
            failed = true;
            return "";
        }
    };
    const range = base === undefined ? ["HEAD"] : [`${base}...HEAD`];
    const [diff, untracked] = await Promise.all([
        run(["diff", "--name-only", ...range]),
        run(["ls-files", "--others", "--exclude-standard"]),
    ]);
    if (failed)
        return undefined;
    return [...new Set(`${diff}\n${untracked}`.split(/\r?\n/).filter((l) => l.trim().length > 0))];
}
export async function testCommand(argv) {
    const sub = argv[0];
    const rest = argv.slice(1);
    // What the TDD loop should run for the current changeset. Prints its
    // reasoning because a narrowed run must never be silent about being narrowed.
    // NOT for the pre-PR gate — that runs the full suite, by rule.
    if (sub === "select") {
        const cwd = process.cwd();
        const explicit = [];
        let json = false;
        let base;
        for (const arg of rest) {
            if (arg === "--json")
                json = true;
            else if (arg.startsWith("--files=")) {
                explicit.push(...arg.slice("--files=".length).split(",").filter(Boolean));
            }
            else if (arg.startsWith("--base=")) {
                const v = arg.slice("--base=".length);
                if (!isSafeRef(v)) {
                    console.error(`test select: refusing unsafe --base value`);
                    return 1;
                }
                base = v;
            }
            else {
                // Deny by default. A silently-ignored typo (`--bas=main`) changes which
                // changeset is considered and looks identical to a correct run.
                console.error(`test select: unrecognised argument`);
                return 1;
            }
        }
        const { reads, warnings, configDir } = loadTestMap(cwd);
        // Reported, never swallowed: a dropped rule widens the run, and the reason
        // it was dropped is the only signal that the map has rotted.
        for (const w of warnings)
            console.error(`test select: ${w}`);
        const discovered = explicit.length > 0 ? explicit : await changedPaths(cwd, base);
        if (discovered === undefined) {
            // git failed. Escalate — never present this as "nothing to run".
            const { framework } = await detectFramework(cwd);
            const full = {
                mode: "full",
                full: true,
                related: [],
                files: [],
                reason: "could not determine the changeset from git, running everything",
            };
            const cmds = selectionCommands(full, framework);
            if (json) {
                console.log(JSON.stringify({ ...full, framework, warnings, commands: cmds }));
            }
            else {
                console.log(`# ${full.reason}`);
                for (const c of cmds)
                    console.log(c);
            }
            return 0;
        }
        const selection = selectTests(discovered, reads, configDir);
        const { framework } = await detectFramework(cwd);
        const commands = selectionCommands(selection, framework);
        if (json) {
            console.log(JSON.stringify({ ...selection, framework, warnings, commands }));
            return 0;
        }
        console.log(`# ${selection.reason}`);
        if (commands.length === 0)
            console.log("# nothing to run");
        for (const c of commands)
            console.log(c);
        return 0;
    }
    if (sub === "detect-framework") {
        const workspaceArg = rest[0] ?? process.cwd();
        const result = await detectFramework(workspaceArg);
        console.log(JSON.stringify(result));
        return result.framework === "unknown" ? 1 : 0;
    }
    if (sub === "write") {
        const targetPath = rest[0];
        if (targetPath === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} test write <target-path>  (content read from stdin)`);
            return 1;
        }
        // Every refusal reason maps to a recovery route. This one needs its own:
        // the Write tool is not offered as a fallback, so
        // without a stated route a large-but-clean test body has no way forward.
        const buffer = await readBoundedStdin("test write", `  Split the test into two files and write each with \`${resolveBrandSlugSync()} test write\`.`);
        if (buffer === null)
            return 1;
        const result = await writeTest({
            targetPath,
            content: buffer,
            workspaceDir: process.cwd(),
        });
        if (!result.ok) {
            console.error(`✗ ${result.error}`);
            if (result.secretHits && result.secretHits.length > 0) {
                for (const hit of result.secretHits) {
                    console.error(`  - line ${hit.line}: ${hit.type} ${hit.redacted}`);
                }
            }
            return 1;
        }
        console.log(`✓ ${result.written}`);
        return 0;
    }
    console.error(`Unknown test subcommand: ${sub}
` +
        `Usage: ${resolveBrandSlugSync()} test <select|write|detect-framework>`);
    return 1;
}
//# sourceMappingURL=test.js.map