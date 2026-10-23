import { type HandoverRecord } from "../../dashboard/handover.js";
import type { SpawnFn } from "../create-issue.js";
export declare const HANDOVER_LABEL_COMMAND = "gh label create handover --description \"3C delivery handover\" --color 0E8A16";
export type FileHandoverResult = {
    readonly ok: true;
    readonly created: boolean;
    readonly number: number;
    readonly url: string;
} | {
    readonly ok: false;
    readonly reason: "invalid-block" | "secret" | "gh-failed" | "close-failed";
    readonly message: string;
    /** The commands that finish the job by hand, in order. */
    readonly manual: ReadonlyArray<string>;
};
export declare function handoverTitle(r: HandoverRecord): string;
export declare function fileHandover(body: string, spawn: SpawnFn): Promise<FileHandoverResult>;
/** The real gh, bounded: a hung network call must not hang the ship step. */
export declare const ghSpawn: SpawnFn;
//# sourceMappingURL=file-handover.d.ts.map