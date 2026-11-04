import { type Note } from "./notes.js";
export interface StoreLimits {
    readonly notes: number;
    readonly bytes: number;
}
export declare const STORE_LIMITS: StoreLimits;
export declare const FORMAT = 2;
export interface StoreMeta {
    readonly repo: string | null;
    readonly syncedAt: string;
}
export interface Store {
    readonly meta: StoreMeta;
    readonly notes: ReadonlyArray<Note>;
}
export type StoreRead = {
    readonly kind: "absent";
} | {
    readonly kind: "refused";
    readonly reason: string;
} | {
    readonly kind: "found";
    readonly store: Store;
};
export type StoreWrite = {
    readonly ok: true;
    readonly bytes: number;
} | {
    readonly ok: false;
    readonly cap: "notes" | "bytes";
    readonly count: number;
    readonly limit: number;
};
export declare const memoryDir: (ws: string) => string;
export declare function writeStore(ws: string, store: Store, limits?: StoreLimits): Promise<StoreWrite>;
export declare function readStore(ws: string, limits?: StoreLimits): Promise<StoreRead>;
//# sourceMappingURL=store.d.ts.map