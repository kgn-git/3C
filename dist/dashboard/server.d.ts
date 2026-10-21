import { type DashboardState } from "./state.js";
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
    readonly docsDir?: string;
    readonly since?: string;
    /**
     * Where post-listen socket failures are reported. Without it an accept error
     * is swallowed and the developer sees a hung browser with no signal (A09).
     */
    readonly log?: (message: string) => void;
    /**
     * Overridable for tests only. The CWE-400 claim is about the COST of a
     * request, and cost is not observable from a status code — a gate moved
     * below the build still returns the same 403. This seam makes the number of
     * builds assertable.
     */
    readonly buildState?: () => Promise<DashboardState>;
}
export interface RunningServer {
    readonly url: string;
    readonly port: number;
    /** The address the socket is actually bound to, read from server.address(). */
    readonly host: string;
    readonly close: () => Promise<void>;
}
/**
 * Where `npm run build` puts the bundle, resolved relative to this module.
 *
 * Two candidates because this module runs from two layouts: `dist/dashboard/`
 * in an install (bundle at `dist/ui`), and `src/dashboard/` under the test
 * runner or tsx (bundle still at `dist/ui`, one level further up). Returning
 * only the first would make every source-run start fail closed on a bundle
 * that is in fact present.
 */
export declare function defaultAssetDir(): string;
/**
 * What the developer is told when the listening socket fails after start-up.
 *
 * The errno CLASS and nothing else: the thrown Error's message and stack stay
 * server-side (A10), and the line names the recovery rather than the cause.
 */
export declare function socketErrorMessage(code: string | undefined): string;
/**
 * Starts the loopback dashboard server.
 *
 * Rejects — rather than falling back to another port — when the requested port
 * cannot be bound. Silently moving would make the printed URL a guess.
 */
export declare function startDashboardServer(opts: ServerOptions): Promise<RunningServer>;
//# sourceMappingURL=server.d.ts.map