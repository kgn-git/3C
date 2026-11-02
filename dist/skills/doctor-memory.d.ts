import type { Finding } from "./doctor.js";
/** Whether an installed handover template lacks something the memory reads. */
export declare const lacksMemoryLines: (template: string) => boolean;
export declare const outdatedTemplateMessage: (slug: string) => string;
/** One line about the delivery memory. A missing memory is normal, so only an unreadable one warns. */
export declare function memoryFinding(workspaceDir: string, slug: string): Promise<Finding>;
//# sourceMappingURL=doctor-memory.d.ts.map