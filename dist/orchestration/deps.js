// #262: intra-workspace cross-project dependency graph — the deterministic core
// behind /3c-programme-manager. Discovers `project.yaml` files, reads the
// `.3c/dependencies.yaml` edge ledger, resolves a delivery order (topological,
// cycle-detecting), and validates new edges. Pure + tested; the prose skill
// drives it via the `3c deps` CLI (same pattern as `reconcileFindings`).
import { readdir, readFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import * as yaml from "js-yaml";
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".3c"]);
async function findProjectYamls(ws) {
    const out = [];
    async function walk(dir) {
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            if (e.isDirectory()) {
                if (!SKIP_DIRS.has(e.name))
                    await walk(join(dir, e.name));
            }
            else if (e.isFile() && e.name === "project.yaml") {
                out.push(join(dir, e.name));
            }
        }
    }
    await walk(ws);
    return out;
}
export async function loadGraph(ws) {
    const projects = [];
    for (const file of await findProjectYamls(ws)) {
        let raw;
        try {
            raw = yaml.load(await readFile(file, "utf8"));
        }
        catch {
            continue;
        }
        if (!raw || typeof raw !== "object")
            continue;
        const o = raw;
        if (typeof o.id !== "string" || o.id.length === 0)
            continue;
        const path = (relative(ws, dirname(file)) || ".").split("\\").join("/");
        projects.push({
            id: o.id,
            path,
            ...(typeof o.name === "string" ? { name: o.name } : {}),
            ...(typeof o.build === "string" ? { build: o.build } : {}),
            ...(typeof o.test === "string" ? { test: o.test } : {}),
        });
    }
    let edges = [];
    try {
        const depRaw = yaml.load(await readFile(join(ws, ".3c", "dependencies.yaml"), "utf8"));
        if (depRaw && Array.isArray(depRaw.edges)) {
            edges = depRaw.edges.filter((e) => !!e &&
                typeof e === "object" &&
                typeof e.from === "string" &&
                typeof e.to === "string");
        }
    }
    catch {
        // no ledger yet — empty edge set
    }
    return { projects, edges };
}
/**
 * Topological delivery order (dependencies before dependents). With `target`,
 * restricts to the target projects + their transitive dependencies. Returns the
 * unresolved set as `cycle` when a cycle blocks completion.
 */
export function resolveOrder(graph, target) {
    const ids = new Set(graph.projects.map((p) => p.id));
    const deps = new Map();
    for (const id of ids)
        deps.set(id, new Set());
    for (const e of graph.edges) {
        if (ids.has(e.from) && ids.has(e.to))
            deps.get(e.from).add(e.to);
    }
    let nodes = new Set(ids);
    if (target && target.length > 0) {
        nodes = new Set();
        const stack = target.filter((t) => ids.has(t));
        while (stack.length) {
            const n = stack.pop();
            if (nodes.has(n))
                continue;
            nodes.add(n);
            for (const d of deps.get(n) ?? [])
                stack.push(d);
        }
    }
    const remaining = new Set(nodes);
    const order = [];
    while (remaining.size) {
        const ready = [...remaining]
            .filter((n) => [...(deps.get(n) ?? [])].every((d) => !remaining.has(d)))
            .sort();
        if (ready.length === 0)
            return { ok: false, cycle: [...remaining].sort() };
        for (const n of ready) {
            order.push(n);
            remaining.delete(n);
        }
    }
    return { ok: true, order };
}
/** Validate + add an edge: ids must exist, no self-edge, must not introduce a cycle. */
export function addEdge(graph, edge) {
    const ids = new Set(graph.projects.map((p) => p.id));
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
        return { ok: false, error: `unknown project id in edge ${edge.from} -> ${edge.to}` };
    }
    if (edge.from === edge.to) {
        return { ok: false, error: `self-edge not allowed: ${edge.from}` };
    }
    const stamped = {
        ...edge,
        addedAt: edge.addedAt ?? new Date().toISOString().slice(0, 10),
    };
    const candidate = {
        projects: graph.projects,
        edges: [...graph.edges, stamped],
    };
    const r = resolveOrder(candidate);
    if (!r.ok) {
        return {
            ok: false,
            error: `edge ${edge.from} -> ${edge.to} would introduce a cycle: ${r.cycle.join(" -> ")}`,
        };
    }
    return { ok: true, graph: candidate };
}
/** Serialise the ledger (edges only — projects are discovered from project.yaml). */
export function serialize(graph) {
    return yaml.dump({ edges: graph.edges.map((e) => ({ ...e })) });
}
//# sourceMappingURL=deps.js.map