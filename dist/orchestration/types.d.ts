export type Severity = "blocking" | "warning" | "suggestion";
export type Verdict = "blocking" | "advisory" | "clean";
/** A single issue raised by one specialist agent. */
export interface Finding {
    readonly agent: string;
    readonly severity: Severity;
    readonly category: string;
    readonly message: string;
    readonly file?: string;
    readonly line?: number;
    readonly suggestion?: string;
}
/** A reconciled finding: de-duplicated across agents, with provenance. */
export interface RankedFinding {
    readonly agents: ReadonlyArray<string>;
    readonly severity: Severity;
    readonly category: string;
    readonly message: string;
    readonly file?: string;
    readonly line?: number;
    readonly suggestion?: string;
    /** true when agents disagreed on severity for this finding — surface to a human. */
    readonly needsHuman: boolean;
}
export interface BoardSummary {
    readonly blocking: number;
    readonly warning: number;
    readonly suggestion: number;
    readonly needsHuman: number;
    readonly byAgent: Record<string, number>;
}
export interface BoardReport {
    readonly findings: ReadonlyArray<RankedFinding>;
    readonly verdict: Verdict;
    readonly summary: BoardSummary;
}
export interface Project {
    readonly id: string;
    readonly path: string;
    readonly name?: string;
    readonly build?: string;
    readonly test?: string;
}
/** `from` depends on `to` — so `to` is delivered before `from`. */
export interface DepEdge {
    readonly from: string;
    readonly to: string;
    readonly reason?: string;
    readonly source?: string;
    readonly addedAt?: string;
}
export interface DependencyGraph {
    readonly projects: ReadonlyArray<Project>;
    readonly edges: ReadonlyArray<DepEdge>;
}
//# sourceMappingURL=types.d.ts.map