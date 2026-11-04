import type { Finding } from "./doctor.js";
/**
 * What the orchestrator will do with `hooks.yaml`, read the same way it reads it: a structural fault bypasses the
 * whole chain, and a hook that holds a credential is refused on its own. A missing file or an empty list is normal.
 */
export declare function hooksConfigFindings(workspaceDir: string, slug: string): Promise<Finding[]>;
//# sourceMappingURL=doctor-hooks-config.d.ts.map