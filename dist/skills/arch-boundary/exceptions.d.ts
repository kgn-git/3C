export interface ExceptionEntry {
    readonly reason: string;
    readonly expires: string;
}
export type Exceptions = Readonly<Record<string, ExceptionEntry>>;
export declare function loadExceptions(ws: string): Promise<Exceptions>;
export declare function addException(ws: string, key: string, reason: string, expires: string): Promise<void>;
export declare function isExcepted(exc: Exceptions, key: string, now: Date): boolean;
//# sourceMappingURL=exceptions.d.ts.map