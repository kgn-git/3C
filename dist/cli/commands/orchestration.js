import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { addEdge, loadGraph, resolveOrder, serialize } from "../../orchestration/deps.js";
import { reconcileFromJson } from "../../orchestration/reconcile.js";
import { flagValue } from "../argv.js";
import { readBoundedStdin } from "../read-input.js";
// Reconcile multi-agent review findings into one board report. Reads a
// `{ agent: Finding[] }` JSON from stdin or --file; used by /3c-review-board.
export async function reconcileCommand(argv) {
    const file = flagValue(argv, "--file");
    // stdin AND --file are bounded alike — an unbounded --file would make
    // the refusal's route a way around the cap.
    const json = await readBoundedStdin("reconcile", 
    // Not "fewer agents per call": reconcile merges agreement ACROSS agents,
    // so splitting them changes the verdict instead of bounding the input.
    "  Shorten each finding's message and suggestion, then re-run; --file is held to the same limit.", file ? createReadStream(file) : process.stdin);
    if (json === null)
        return 1;
    try {
        process.stdout.write(reconcileFromJson(json));
    }
    catch (e) {
        console.error(`reconcile: invalid findings JSON: ${e.message}`);
        return 1;
    }
    return 0;
}
// Cross-project dependency ledger ops for /3c-programme-manager.
export async function depsCommand(argv) {
    const ws = process.cwd();
    const sub = argv[0];
    const graph = await loadGraph(ws);
    if (sub === "order") {
        const t = flagValue(argv, "--target");
        const target = t ? t.split(",").filter(Boolean) : undefined;
        const r = resolveOrder(graph, target);
        if (!r.ok) {
            console.error(`✗ dependency cycle: ${r.cycle.join(" -> ")}`);
            return 1;
        }
        const hasDeps = new Set(graph.edges.map((e) => e.from));
        const readyNow = r.order.filter((id) => !hasDeps.has(id));
        console.log(r.order.length ? r.order.join("\n") : "(no projects found)");
        if (readyNow.length)
            console.log(`\nready now: ${readyNow.join(", ")}`);
        return 0;
    }
    if (sub === "validate") {
        const r = resolveOrder(graph);
        if (!r.ok) {
            console.error(`✗ dependency cycle: ${r.cycle.join(" -> ")}`);
            return 1;
        }
        console.log(`✓ ${graph.projects.length} project(s), ${graph.edges.length} edge(s); no cycles.`);
        return 0;
    }
    if (sub === "add") {
        const from = flagValue(argv, "--from");
        const to = flagValue(argv, "--to");
        const reason = flagValue(argv, "--reason");
        const source = flagValue(argv, "--source");
        if (!from || !to) {
            console.error("Usage: deps add --from=<id> --to=<id> [--reason=...] [--source=...]");
            return 1;
        }
        const r = addEdge(graph, {
            from,
            to,
            ...(reason ? { reason } : {}),
            ...(source ? { source } : {}),
        });
        if (!r.ok) {
            console.error(`✗ ${r.error}`);
            return 1;
        }
        await mkdir(join(ws, ".3c"), { recursive: true });
        await writeFile(join(ws, ".3c", "dependencies.yaml"), serialize(r.graph), "utf8");
        console.log(`✓ recorded ${from} -> ${to} in .3c/dependencies.yaml`);
        return 0;
    }
    console.log("Usage: deps <order [--target=<id,...>] | validate | add --from --to [--reason --source]>");
    return 1;
}
//# sourceMappingURL=orchestration.js.map