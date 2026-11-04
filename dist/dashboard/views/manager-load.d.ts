import { type DeveloperEnv } from "./developer-load.js";
import { type ManagerView } from "./manager.js";
export interface ManagerEnv extends DeveloperEnv {
    /** False for the shared page, which carries no prompt. */
    readonly withPrompts?: boolean;
}
export declare function loadManagerView(env: ManagerEnv): Promise<ManagerView>;
//# sourceMappingURL=manager-load.d.ts.map