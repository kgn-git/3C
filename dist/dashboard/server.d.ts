import { type DashboardState } from "./state.js";
import { type SourceDeps } from "./delivery-source.js";
/** The only host this server ever binds. */
export declare const LOOPBACK = "127.0.0.1";
/**
 * Deliberately not 3000/5173/8000/8080 — a developer running the dashboard
 * should never collide with, or be mistaken for, an app dev server (A02).
 */
export declare const DEFAULT_PORT = 3080;
export interface ServerOptions {
    readonly cwd: string;
    readonly port?: number;
    /** Overridable for tests; defaults to the bundle shipped in dist/ui. */
    readonly assetDir?: string;
    /** Test seam for the handover-issue fetch; defaults to the real gh and git. */
    readonly delivery?: SourceDeps;
    readonly since?: string;
    /**
     * Where post-listen socket failures are reported. Without it an accept error
     * is swallowed and the developer sees a hung browser with no signal (A09).
     */
    readonly log?: (message: string) => void;
    /**
     * Test seam: request cost (CWE-400) is invisible in a status code, so tests
     * count builds instead.
     */
    readonly buildState?: () => Promise<DashboardState>;
}
export interface RunningServer {
    readonly url: string;
    readonly port: number;
    readonly host: string;
    readonly close: () => Promise<void>;
}
/**
 * Two candidates: this module runs from `dist/dashboard/` and, under tsx or
 * tests, `src/dashboard/`. Only the first would refuse every source-run start.
 */
export declare function defaultAssetDir(): string;
/** The errno class only: message and stack stay server-side (A10). */
export declare function socketErrorMessage(code: string | undefined): string;
/** No fallback port on a bind failure: silently moving would make the printed URL a guess. */
export declare function startDashboardServer(opts: ServerOptions): Promise<RunningServer>;
//# sourceMappingURL=server.d.ts.map