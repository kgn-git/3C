import type { DeliverySource } from "../../handovers/delivery-source.js";
import { type GitRun } from "../../memory/git-probe.js";
import type { StoreLimits } from "../../memory/store.js";
import { type MemoryUse } from "../../memory/store-gate.js";
import { type DeveloperView } from "./developer.js";
export interface DeveloperEnv {
    readonly cwd: string;
    readonly now: Date;
    readonly source: DeliverySource;
    /** Test seam for git; defaults to the real one. */
    readonly git?: GitRun;
    readonly limits?: StoreLimits;
    /** A memory already read through the gate, so two views do not read it twice. */
    readonly memory?: MemoryUse;
}
export declare function installedSkills(ws: string): Promise<Set<string>>;
export declare function loadDeveloperView(env: DeveloperEnv): Promise<DeveloperView>;
//# sourceMappingURL=developer-load.d.ts.map