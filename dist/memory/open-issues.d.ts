import { type SourceDeps } from "../handovers/delivery-source.js";
/** The numbers named on `open` notes ("needs a human"), newest handover first, each once; none when the memory is missing or refused. */
export declare function openNoteIssues(ws: string): Promise<ReadonlyArray<number>>;
export declare const memoryDeps: SourceDeps;
//# sourceMappingURL=open-issues.d.ts.map