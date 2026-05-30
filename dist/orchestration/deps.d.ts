import type { DepEdge, DependencyGraph } from "./types.js";
export type OrderResult = {
    readonly ok: true;
    readonly order: ReadonlyArray<string>;
} | {
    readonly ok: false;
    readonly cycle: ReadonlyArray<string>;
};
export type AddEdgeResult = {
    readonly ok: true;
    readonly graph: DependencyGraph;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function loadGraph(ws: string): Promise<DependencyGraph>;
/**
 * Topological delivery order (dependencies before dependents). With `target`,
 * restricts to the target projects + their transitive dependencies. Returns the
 * unresolved set as `cycle` when a cycle blocks completion.
 */
export declare function resolveOrder(graph: DependencyGraph, target?: ReadonlyArray<string>): OrderResult;
/** Validate + add an edge: ids must exist, no self-edge, must not introduce a cycle. */
export declare function addEdge(graph: DependencyGraph, edge: DepEdge): AddEdgeResult;
/** Serialise the ledger (edges only — projects are discovered from project.yaml). */
export declare function serialize(graph: DependencyGraph): string;
//# sourceMappingURL=deps.d.ts.map