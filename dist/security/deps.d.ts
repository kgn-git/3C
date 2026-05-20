import { type Finding } from "./findings.js";
import type { Severity } from "./severity.js";
export type DepAdvisory = Readonly<Record<string, {
    severity: Severity;
    cve: string;
}>>;
export declare function addedDependencies(diffText: string): string[];
export declare function checkDeps(deps: ReadonlyArray<string>, advisory: DepAdvisory): Finding[];
//# sourceMappingURL=deps.d.ts.map