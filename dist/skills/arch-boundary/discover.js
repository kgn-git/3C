// Draft an architecture.yaml from the REAL import graph.
// Deterministic per AD-03 — directory-level graph, Tarjan SCC, condensation
// tiers; naming/principles stay the architect agent's advisory job. Uses the
// same import-resolution kernel as the gate (parseRelativeImports), so the
// draft can never propose a deny pair the gate would flag.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { parseRelativeImports } from "../../validate/post-edit/layers.js";
import { archConfigPath, hasAuthoredContent, loadArchConfig, } from "../../validate/arch-config.js";
import { EXAMPLE_BLOCK, PACKAGES_HINT, USAGE_EXPLAINER } from "./scaffold.js";
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
 * of `arch-check discover`, exported for tests and reuse. `opts.proposed`
 * names the DESTINATION: the zero-tier text differs by it, because a header
 * claiming "the gate is still INERT" is false on the proposal path, where the
 * adopter's active config keeps enforcing.
 */
export function draftFromFiles(files, opts = {}) {
    const g = buildGraph(files);
    const tiers = tiersOf(g);
    const slug = resolveBrandSlugSync();
    const lines = [];
    // On the proposal path the active config is left alone for one of
    // two very different reasons, and the copy must not conflate them. "Your
    // active config keeps enforcing" is true when it is populated and healthy;
    // over a config that does not parse it is false, and it invites the adopter
    // to leave a dead gate in place.
    const brokenNote = [
        "# WARNING: your active architecture.yaml could NOT be parsed or validated,",
        "# so the boundary gate is currently failing closed and this draft was sent",
        "# here rather than over the top of it. Nothing has been lost. Fix the",
        "# active file by hand, or replace it with this draft once you have read it.",
        "#",
    ];
    if (tiers.length === 0) {
        if (opts.proposed) {
            // The active config is live and enforcing; this file is a by-product
            // the adopter should NOT act on. No hand-edit instruction — the loader
            // never reads this path, so edits here would silently do nothing.
            if (opts.activeBroken)
                lines.push(...brokenNote);
            lines.push("# Architecture boundary PROPOSAL — `arch-check discover` found no", "# tracked non-test JS/TS source in sub-directories to cluster, so this", "# proposal declares nothing. Your active architecture.yaml is untouched", "# — the gate still reads that file, never this one. Delete this file, or", "# run discover again once JS/TS source under sub-directories is", "# committed.");
        }
        else {
            // This draft REPLACES the starter at the active path, so it must keep
            // teaching what the starter taught. "Rename the tiers" over zero tiers —
            // with the worked example gone — would strand the hand-edit route the
            // CLI's own message points at.
            lines.push("# Architecture boundary rules — `arch-check discover` found no tracked", "# non-test JS/TS source in sub-directories to cluster, so no layers", "# were drafted and the gate is still INERT. Define layers/deny below by", "# hand (worked example included), or commit JS/TS source under", "# sub-directories and run discover again.", "#", `${USAGE_EXPLAINER}#`, EXAMPLE_BLOCK, 
            // This draft REPLACED the starter at the active path, so it keeps
            // everything the starter taught — including the monorepo shape
            // discover itself cannot emit (AC13). The zero-tier PROPOSAL above
            // is a by-product the adopter is told to delete, so it carries
            // neither.
            "#", PACKAGES_HINT);
        }
        if (g.unassigned.length > 0) {
            lines.push("# Tracked root-level source files (a layer needs a directory —", "# move them, or map them into a layer yourself):");
            for (const f of g.unassigned)
                lines.push(`#   ${f}`);
        }
        lines.push("");
        return lines.join("\n");
    }
    // The destination reaches the WITH-TIERS header too. A proposal that said
    // "keep it as your active config" would contradict the CLI line printed in
    // the same run, and invite the clobber this path exists to avoid. One tier is also called out: there is no direction to enforce
    // until a second layer exists, so "prune the deny pairs" would be advice
    // about an empty list.
    const single = tiers.length < 2;
    if (opts.proposed) {
        if (opts.activeBroken)
            lines.push(...brokenNote);
        lines.push("# Architecture boundary PROPOSAL — generated by `arch-check discover`", "# from the repository's actual import graph. Your active", "# architecture.yaml is untouched, and the gate still reads that file,", "# never this one. Review the layers below; adopt them by copying them", "# into your active config yourself.");
        if (single) {
            lines.push("# NOTE: a single tier was discovered, so this proposal declares no", "# deny pairs — adopting it as-is would leave the gate blocking", "# nothing.");
        }
    }
    else if (single) {
        lines.push("# Architecture boundary rules — DRAFT generated by `arch-check discover`", "# from the repository's actual import graph. Only ONE tier was found, so", "# there is no import direction to enforce yet and this file blocks", "# nothing. Split the layer below into the layers your team actually has,", "# then add the deny pairs between them (worked example at the bottom).", `# Your architect agent (\`/${slug}-review-board\`) can help name them.`);
    }
    else {
        lines.push("# Architecture boundary rules — DRAFT generated by `arch-check discover`", "# from the repository's actual import graph. Review it: rename the tiers", "# to meaningful layer names, prune or extend the deny pairs, then keep it", `# as your active config. Your architect agent (\`/${slug}-review-board\`)`, "# can help name layers and document the principles behind them.");
    }
    lines.push("#", USAGE_EXPLAINER, 
    // Discover can only emit a single ROOT map, and a root map applies across
    // every package. A monorepo adopter
    // who bootstraps here would get workspace-wide rules they never wrote, so
    // every draft names the `packages:` shape it did not produce — on both
    // destinations, unlike the hand-edit example above.
    "#", PACKAGES_HINT, "");
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
    if (single) {
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
    // The single-tier ACTIVE draft is one an adopter is told to hand-
    // edit ("split the layer, add the deny pairs"), and it replaced the starter
    // — so it has to carry the syntax the starter carried, same as the
    // zero-tier case. Proposals are not hand-edited: the loader never reads
    // them, so shipping the example there would invite edits that do nothing.
    if (single && !opts.proposed) {
        lines.push("");
        lines.push(EXAMPLE_BLOCK);
    }
    lines.push("");
    return lines.join("\n");
}
/**
 * Run discovery against a workspace. Destination matrix: no config or
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
    const slug = resolveBrandSlugSync();
    const dir = join(ws, `.${slug}`);
    const activePath = archConfigPath(ws);
    // The destination comes from the loader's KIND, never from a parse here —
    // `tests/validate/arch-config-consolidation.test.ts` pins exactly one parser
    // in src/, and a second one could diverge from it. Absent and inert both land at the active path (an
    // inert file holds no rules, so replacing it loses nothing); a config that
    // is populated OR unreadable is left alone. Destination is resolved BEFORE
    // rendering, because the draft's own header depends on it.
    // The destination asks whether replacing this file would DESTROY work —
    // not whether the gate currently enforces anything. The two answers differ
    // on a config whose layers are named but whose deny list is still empty
    // (real work, no enforcement) and on one that does not parse (real work we
    // cannot read). Both must be preserved; only an absent file and an unedited
    // comment-only starter are safe to replace.
    const loaded = await loadArchConfig(ws);
    const proposed = hasAuthoredContent(loaded);
    const reason = loaded.kind === "malformed"
        ? "malformed"
        : proposed
            ? "populated"
            : loaded.kind === "absent"
                ? "absent"
                : "inert";
    const draft = draftFromFiles(files, {
        proposed,
        activeBroken: reason === "malformed",
    });
    const path = proposed ? join(dir, "architecture.proposed.yaml") : activePath;
    await mkdir(dir, { recursive: true });
    await writeFile(path, draft, "utf8");
    const tierCount = (draft.match(/^ {2}tier-\d+:/gm) ?? []).length;
    return { path, proposed, tiers: tierCount, reason };
}
//# sourceMappingURL=discover.js.map