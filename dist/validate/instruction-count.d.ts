export type WarnLevel = "ok" | "warn" | "exceeded";
export interface InstructionCountResult {
    readonly count: number;
    readonly warnLevel: WarnLevel;
}
export declare function countInstructions(text: string): InstructionCountResult;
//# sourceMappingURL=instruction-count.d.ts.map