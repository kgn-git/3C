// #298 VP-03-F05-ext: draft an architecture.yaml from the REAL import graph.
// Deterministic per AD-03 — directory-level graph, Tarjan SCC, condensation
// tiers; naming/principles stay the architect agent's advisory job. Uses the
// same import-resolution kernel as the gate (parseRelativeImports), so the
// draft can never propose a deny pair the gate would flag (AC2).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { parseRelativeImports } from "../../validate/post-edit/layers.js";
import { loadArchConfig } from "./config.js";
import { USAGE_EXPLAINER } from "./scaffold.js";
const SRC_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
const TEST_RE = /(^|\/)tests?\/|\.(test|spec)\.[^/]+$/;
// Cluster rule: node = first path segment; roots with ≥2 source-bearing child
// dirs cluster one level deeper (their direct files are left unassigned for
// the human/agent to place — a draft should not guess at root-file intent).
function clusterOf(relPosix, deepRoots) {
    const seg = relPosix.split("/");
    if (seg.length < 2)
        return null; // top-level file — unconstrained
    if (!deepRoots.has(seg[0]))
        return seg[0];
    return seg.length >= 3 ? `${seg[0]}/${seg[1]}` : null;
}
function buildGraph(files) {
    const srcFiles = files
        .map(([rel, c]) => [rel.split("\\").join("/"), c])
        .filter(([rel]) => SRC_RE.test(rel) && !TEST_RE.test(rel));
    const childDirs = new Map();
    for (const [rel] of srcFiles) {
        const seg = rel.split("/");
        if (seg.length >= 3) {
            let set = childDirs.get(seg[0]);
            if (!set)
                childDirs.set(seg[0], (set = new Set()));
            set.add(seg[1]);
        }
    }
    const deepRoots = new Set([...childDirs.entries()].filter(([, c]) => c.size >= 2).map(([r]) => r));
    const nodes = new Set();
    const edges = new Map();
    const unassigned = [];
    for (const [rel, content] of srcFiles) {
        const from = clusterOf(rel, deepRoots);
        if (from === null) {
            unassigned.push(rel);
            continue;
        }
        nodes.add(from);
        for (const { resolved } of parseRelativeImports(rel, content)) {
            const to = clusterOf(resolved, deepRoots);
            if (to === null || to === from)
                continue;
            nodes.add(to);
            let set = edges.get(from);
            if (!set)
                edges.set(from, (set = new Set()));
            set.add(to);
        }
    }
    return {
        nodes: [...nodes].sort(),
        edges,
        unassigned: unassigned.sort(),
    };
}
// Recursive Tarjan — nodes are directory clusters, so the recursion depth is
// bounded by the cluster count (dozens, not files). Deterministic order.
function stronglyConnected(g) {
    let index = 0;
    const idx = new Map();
    const low = new Map();
    const onStack = new Set();
    const stack = [];
    const sccs = [];
    function strongConnect(v) {
        idx.set(v, index);
        low.set(v, index);
        index++;
        stack.push(v);
        onStack.add(v);
        for (const w of [...(g.edges.get(v) ?? [])].sort()) {
            if (!idx.has(w)) {
                strongConnect(w);
                low.set(v, Math.min(low.get(v), low.get(w)));
            }
            else if (onStack.has(w)) {
                low.set(v, Math.min(low.get(v), idx.get(w)));
            }
        }
        if (low.get(v) === idx.get(v)) {
            const scc = [];
            for (;;) {
                const w = stack.pop();
                onStack.delete(w);
                scc.push(w);
                if (w === v)
                    break;
            }
            sccs.push(scc.sort());
        }
    }
    for (const v of g.nodes)
        if (!idx.has(v))
            strongConnect(v);
    return sccs;
}
// Condensation depth: tier 0 = imports nothing outside its own SCC; edges in
// the condensed DAG always point from a higher tier to a strictly lower one,
// so "deny lower→higher" can never be violated by an existing import (AC2).
function tiersOf(g) {
    const sccs = stronglyConnected(g);
    const sccOf = new Map();
    sccs.forEach((scc, i) => scc.forEach((n) => sccOf.set(n, i)));
    const depth = new Map();
    function depthOf(i) {
        const memo = depth.get(i);
        if (memo !== undefined)
            return memo;
        depth.set(i, 0); // breaks self-reference; SCC-internal edges are not deps
        let d = 0;
        for (const n of sccs[i]) {
            for (const w of g.edges.get(n) ?? []) {
                const j = sccOf.get(w);
                if (j !== i)
                    d = Math.max(d, depthOf(j) + 1);
            }
        }
        depth.set(i, d);
        return d;
    }
    const byDepth = new Map();
    sccs.forEach((scc, i) => {
        const d = depthOf(i);
        const t = byDepth.get(d) ?? { members: [], cyclic: false };
        t.members = [...t.members, ...scc].sort();
        t.cyclic = t.cyclic || scc.length > 1;
        byDepth.set(d, t);
    });
    return [...byDepth.entries()]
        .sort(([a], [b]) => a - b)
        .map(([d, t]) => ({ name: `tier-${d}`, members: t.members, cyclic: t.cyclic }));
}
/**
 * Render a draft architecture.yaml from (path, content) pairs — the pure core
 * of `arch-check discover`, exported for tests and reuse.
 */
export function draftFromFiles(files) {
    const g = buildGraph(files);
    const tiers = tiersOf(g);
    const slug = resolveBrandSlugSync();
    const lines = [];
    lines.push("# Architecture boundary rules — DRAFT generated by `arch-check discover`", "# from the repository's actual import graph. Review it: rename the tiers", "# to meaningful layer names, prune or extend the deny pairs, then keep it", `# as your active config. Your architect agent (\`/${slug}-review-board\`)`, "# can help name layers and document the principles behind them.", "#", USAGE_EXPLAINER, "");
    lines.push("layers:");
    for (const t of tiers) {
        const reason = t.name === "tier-0"
            ? "no imports into other layers — everything may depend on this tier"
            : t.cyclic
                ? "depends only on lower tiers; mutually-importing members share the tier"
                : "depends only on lower tiers";
        lines.push(`  # ${t.name}: ${t.members.join(", ")} — ${reason}.`);
        // JSON string escaping is valid YAML double-quoted scalar syntax, so any
        // tracked path name (quotes included) round-trips safely.
        lines.push(`  ${t.name}: [${t.members.map((m) => JSON.stringify(`${m}/**`)).join(", ")}]`);
    }
    lines.push("");
    lines.push("deny:");
    if (tiers.length < 2) {
        lines.push("  # single tier discovered — no direction to enforce yet.");
        lines.push("  []");
    }
    else {
        for (let i = 0; i < tiers.length; i++) {
            for (let j = i + 1; j < tiers.length; j++) {
                lines.push(`  # no ${tiers[i].name}→${tiers[j].name} import exists today; enforce the direction.`);
                lines.push(`  - ["${tiers[i].name}", "${tiers[j].name}"]`);
            }
        }
    }
    if (g.unassigned.length > 0) {
        lines.push("");
        lines.push("# Unassigned root-level files (place them in a layer yourself):");
        for (const f of g.unassigned)
            lines.push(`#   ${f}`);
    }
    lines.push("");
    return lines.join("\n");
}
/**
 * Run discovery against a workspace. Destination matrix (#298): no config or
 * an inert one (file parses to nothing) → write `.<slug>/architecture.yaml`;
 * a populated config → write `.<slug>/architecture.proposed.yaml`, never
 * clobbering the active rules.
 */
export async function runArchDiscover(ws) {
    const disc = await discoverWorkspaceFiles(ws);
    if (!disc.ok)
        throw new Error(disc.error);
    const files = [];
    for (const rel of disc.files) {
        const posixRel = rel.split("\\").join("/");
        if (!SRC_RE.test(posixRel) || TEST_RE.test(posixRel))
            continue;
        try {
            files.push([posixRel, await readFile(join(ws, rel), "utf8")]);
        }
        catch {
            /* deleted-but-tracked — skip */
        }
    }
    const draft = draftFromFiles(files);
    const slug = resolveBrandSlugSync();
    const dir = join(ws, `.${slug}`);
    const activePath = join(dir, "architecture.yaml");
    // Absent and inert-starter configs both load as null and both land at the
    // active path — an inert file holds no rules, so replacing it loses nothing.
    const proposed = (await loadArchConfig(ws)) !== null;
    const path = proposed ? join(dir, "architecture.proposed.yaml") : activePath;
    await mkdir(dir, { recursive: true });
    await writeFile(path, draft, "utf8");
    const tierCount = (draft.match(/^ {2}tier-\d+:/gm) ?? []).length;
    return { path, proposed, tiers: tierCount };
}
//# sourceMappingURL=discover.js.map