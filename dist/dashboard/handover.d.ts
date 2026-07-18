export declare const HANDOVER_SCHEMA = "3c-handover/1";
export interface HandoverVerdict {
    readonly level?: string;
    readonly blocking?: number;
    readonly warnings?: number;
    readonly suggestions?: number;
    readonly fixed_in_branch?: number;
}
export interface HandoverLoc {
    readonly added?: number;
    readonly removed?: number;
    readonly files?: number;
}
export interface HandoverRecord {
    readonly handover: number;
    readonly issues: ReadonlyArray<number>;
    readonly title?: string;
    readonly pr?: number;
    readonly merge_sha?: string;
    readonly branch?: string;
    readonly started?: string;
    readonly merged?: string;
    readonly verdict?: HandoverVerdict;
    readonly tests_total?: number;
    readonly loc?: HandoverLoc;
    readonly follow_ups: ReadonlyArray<number>;
    readonly gates_fired?: ReadonlyArray<string>;
}
export type HandoverParse = {
    kind: "record";
    record: HandoverRecord;
} | {
    kind: "legacy";
} | {
    kind: "malformed";
    reason: string;
};
export interface HandoverScan {
    readonly records: ReadonlyArray<HandoverRecord>;
    readonly legacy: number;
    readonly malformed: number;
}
export declare function parseHandover(fileName: string, content: string): HandoverParse;
export declare function readHandovers(docsDir: string): Promise<HandoverScan>;
//# sourceMappingURL=handover.d.ts.map