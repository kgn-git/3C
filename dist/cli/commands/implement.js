import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { createIssue } from "../../skills/create-issue.js";
import { formatBranchName } from "../../skills/implement/branch-name.js";
import { createPr } from "../../skills/implement/create-pr.js";
import { fileHandover, ghSpawn } from "../../skills/implement/file-handover.js";
import { fetchIssue } from "../../skills/implement/fetch-issue.js";
import { scanSecretsCli } from "../scan-secrets.js";
import { readBoundedStdin } from "../read-input.js";
export async function createIssueCommand(rest) {
    const force = rest.includes("--force");
    // Read JSON payload from stdin, bounded (CWE-400, like `test write`).
    const buffer = await readBoundedStdin("create-issue", bodyRoute("issue"));
    if (buffer === null)
        return 1;
    let payload;
    try {
        payload = JSON.parse(buffer);
    }
    catch (err) {
        console.error(`✗ invalid IssuePayload JSON on stdin: ${err.message}`);
        return 1;
    }
    if (typeof payload !== "object" ||
        payload === null ||
        typeof payload.title !== "string" ||
        typeof payload.body !== "string") {
        console.error(`✗ IssuePayload must be a JSON object with at least \"title\" and \"body\" string fields`);
        return 1;
    }
    // Route through the bundled MCP PM server when a non-GitHub tool is
    // configured (or --tool=); otherwise the unchanged gh path (AC7).
    let toolFlag;
    for (const a of rest) {
        if (a.startsWith("--tool="))
            toolFlag = a.slice("--tool=".length);
    }
    const { resolvePmSelection } = await import("../../mcp/pm/select.js");
    const sel = await resolvePmSelection(process.cwd(), toolFlag);
    let pmRouter;
    if (sel) {
        const { pmCreateIssue } = await import("../../mcp/pm/registry.js");
        const { defaultResolver } = await import("../../hooks/credentials.js");
        const http = async (req) => {
            const resp = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                ...(req.body !== undefined ? { body: req.body } : {}),
            });
            return { status: resp.status, body: await resp.text() };
        };
        pmRouter = async (p) => pmCreateIssue(p, {
            tool: sel.tool,
            http,
            resolver: defaultResolver,
            baseUrl: sel.baseUrl,
            project: sel.project,
            tokenRef: sel.tokenRef,
        });
    }
    const result = await createIssue(payload, {
        force,
        ...(pmRouter ? { pmRouter } : {}),
    });
    // Always relay warnings to stderr.
    for (const w of result.warnings) {
        const where = w.line !== undefined ? `line ${w.line}: ` : "";
        process.stderr.write(`⚠ ${w.type}: ${where}${w.message}\n`);
    }
    if (!result.ok) {
        if (result.error) {
            console.error(`\n✗ ${result.error}`);
        }
        else {
            console.error("\n✗ refusing to create issue — secret-pattern warning(s) above. Re-run with --force to override (audited).");
        }
        return 1;
    }
    console.log(`\n✓ ${result.ref.url}`);
    console.log(`  Issue #${result.ref.number}`);
    return 0;
}
export async function scanSecretsCommand(argv = []) {
    const buffer = await readBoundedStdin("scan-secrets", 
    // Split at LINE boundaries: every detector matches within one line, so a
    // line-aligned split cannot cut a secret in two and scan both halves clean.
    "  NOT scanned — this is not a clean result. Scan the text in parts split at line boundaries, one call each.");
    if (buffer === null) {
        // The consumer skills read the JSON, and an empty stdout is not an
        // empty `hits` array — say "not scanned" on the channel they read too.
        // Deliberately no `hits` key: a reader keyed on `hits.length === 0` must
        // not be able to take a refusal for a clean scan.
        process.stdout.write(JSON.stringify({ scanned: false, error: "input not read" }) + "\n");
        return 1;
    }
    const result = scanSecretsCli(buffer, argv);
    process.stdout.write(result.output);
    return result.exitCode;
}
/** The route both GitHub-body verbs share; `--force` is the retry an agent reaches for first. */
const bodyRoute = (what) => `  Shorten the ${what} body and link longer detail instead — GitHub separately rejects a body over ` +
    `65,536 characters. --force does not lift this limit; it only overrides the secret scan.`;
export async function implementCommand(argv) {
    const sub = argv[0];
    const rest = argv.slice(1);
    if (sub === "fetch-issue") {
        let id;
        let repo;
        for (const arg of rest) {
            if (arg.startsWith("--repo=")) {
                repo = arg.slice("--repo=".length);
                if (repo === "") {
                    console.error("--repo= requires a value (e.g. --repo=owner/name)");
                    return 1;
                }
            }
            else if (!arg.startsWith("--") && id === undefined) {
                id = arg;
            }
            else {
                console.error(`Unknown argument: ${arg}`);
                return 1;
            }
        }
        if (id === undefined) {
            const slug = resolveBrandSlugSync();
            console.error(`Usage: ${slug} implement fetch-issue <id> [--repo=<owner/name>]`);
            return 1;
        }
        const result = await fetchIssue(id, repo !== undefined ? { repo } : {});
        if (!result.ok) {
            console.error(`\n✗ ${result.error}`);
            return 1;
        }
        process.stdout.write(JSON.stringify(result.issue) + "\n");
        return 0;
    }
    if (sub === "file-handover") {
        const buffer = await readBoundedStdin("implement file-handover", bodyRoute("handover"));
        if (buffer === null)
            return 1;
        const r = await fileHandover(buffer, ghSpawn);
        if (r.ok) {
            console.log(`\n✓ ${r.url}`);
            console.log(r.created ? `  Handover #${r.number} filed and closed` : `  Handover #${r.number} was already filed — nothing created`);
            return 0;
        }
        console.error(`\n✗ ${r.message}`);
        if (r.manual.length > 0) {
            console.error("  Finish by hand (save the body as handover.md first):");
            for (const m of r.manual)
                console.error(`    ${m}`);
        }
        return 1;
    }
    if (sub === "create-pr") {
        const force = rest.includes("--force");
        const buffer = await readBoundedStdin("implement create-pr", bodyRoute("PR"));
        if (buffer === null)
            return 1;
        let payload;
        try {
            payload = JSON.parse(buffer);
        }
        catch (err) {
            console.error(`✗ invalid PrPayload JSON on stdin: ${err.message}`);
            return 1;
        }
        if (typeof payload !== "object" ||
            payload === null ||
            typeof payload.title !== "string" ||
            typeof payload.body !== "string") {
            console.error(`✗ PrPayload must be a JSON object with at least "title" and "body" string fields`);
            return 1;
        }
        const result = await createPr(payload, { force });
        for (const w of result.warnings) {
            const where = w.line !== undefined ? `line ${w.line}: ` : "";
            process.stderr.write(`⚠ ${w.type}: ${where}${w.message}\n`);
        }
        if (!result.ok) {
            if (result.error) {
                console.error(`\n✗ ${result.error}`);
            }
            else {
                console.error("\n✗ refusing to open PR — secret-pattern warning(s) above. Re-run with --force to override (audited).");
            }
            return 1;
        }
        console.log(`\n✓ ${result.ref.url}`);
        console.log(`  PR #${result.ref.number}`);
        return 0;
    }
    if (sub === "branch-name") {
        // The title is slugified to 50 characters, so "shorten the title" would
        // be the wrong route: an over-cap payload is extra fields, not the title.
        const buffer = await readBoundedStdin("implement branch-name", `  Send only {"id": <number>, "title": <string>} — other fields, such as the issue body, ` +
            `count toward the limit and are not used. If the title alone is over it, shorten the title: ` +
            `the branch keeps only its first 50 slug characters.`);
        if (buffer === null)
            return 1;
        let payload;
        try {
            payload = JSON.parse(buffer);
        }
        catch (err) {
            console.error(`✗ invalid branch-name payload: ${err.message}`);
            return 1;
        }
        if (typeof payload !== "object" ||
            payload === null ||
            typeof payload.id !== "number" ||
            typeof payload.title !== "string") {
            console.error(`✗ branch-name payload must be {"id": <number>, "title": <string>}`);
            return 1;
        }
        const slug = resolveBrandSlugSync();
        const configPath = join(process.cwd(), `.${slug}`, "skills", "implement.yaml");
        let branchPattern;
        try {
            const yaml = await readFile(configPath, "utf8");
            // Match one of:
            //   branchPattern: "value"        (double-quoted)
            //   branchPattern: 'value'        (single-quoted)
            //   branchPattern: bare-value     (no quote, no spaces, comment allowed after)
            // Comments after the value (`# comment`) are explicitly excluded.
            const match = yaml.match(/^branchPattern:[ \t]*(?:"([^"\n]+)"|'([^'\n]+)'|([^\s#"'][^\s#]*))[ \t]*(?:#.*)?$/m);
            const captured = match?.[1] ?? match?.[2] ?? match?.[3];
            if (captured !== undefined)
                branchPattern = captured.trim();
        }
        catch {
            // file absent — use default
        }
        const typed = payload;
        const name = formatBranchName({ id: typed.id, title: typed.title }, branchPattern !== undefined ? { branchPattern } : {});
        process.stdout.write(name + "\n");
        return 0;
    }
    const slug = resolveBrandSlugSync();
    console.error(`Unknown implement subcommand: ${sub ?? "(none)"}`);
    console.error(`Usage: ${slug} implement <fetch-issue|create-pr|branch-name>`);
    return 1;
}
//# sourceMappingURL=implement.js.map