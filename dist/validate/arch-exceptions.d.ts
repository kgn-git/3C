export interface ExceptionEntry {
    readonly reason: string;
    readonly expires: string;
}
export type Exceptions = Readonly<Record<string, ExceptionEntry>>;
/** The waiver store's path. The writer lives in arch-exceptions-write.ts. */
export declare function exceptionsFile(ws: string): string;
export declare function exceptionKey(message: string): string | null;
export declare function loadExceptions(ws: string): Promise<Exceptions>;
export declare const MAX_EXCEPTIONS_BYTES: number;
export declare function isExcepted(exc: Exceptions, key: string, now: Date): boolean;
//# sourceMappingURL=arch-exceptions.d.ts.map