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
/** Parses a handover body whose metadata block opens it. */
export declare function parseHandoverBody(handover: number, body: string): HandoverParse;
/** Validates the YAML between the fences, numbering the record `handover`. */
export declare function validateHandoverFrontmatter(fmText: string, handover: number): {
    kind: "record";
    record: HandoverRecord;
} | {
    kind: "malformed";
    reason: string;
};
/** Validates a parsed handover mapping; the delivery cache re-checks its records with it. */
export declare function validateHandoverObject(fm: unknown, handover: number): {
    kind: "record";
    record: HandoverRecord;
} | {
    kind: "malformed";
    reason: string;
};
//# sourceMappingURL=handover.d.ts.map