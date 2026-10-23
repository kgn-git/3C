import { type SourceDeps } from "../../dashboard/delivery-source.js";
export interface DashboardEnv {
    readonly cwd: string;
    readonly now?: Date;
    readonly open?: (path: string) => Promise<void>;
    /** Test seam for the handover-issue fetch; defaults to the real gh and git. */
    readonly delivery?: SourceDeps;
    /** Output seam; defaults to console.log. */
    readonly log?: (msg: string) => void;
    /**
     * Resolves when the served app should shut down. Defaults to
     * waiting for SIGINT; injected in tests so nothing has to raise a real signal.
     */
    readonly waitForShutdown?: () => Promise<void>;
    /** Bundle directory; defaults to the dist/ui built by `npm run build`. */
    readonly assetDir?: string;
}
export declare function dashboardCommand(argv: readonly string[], env?: DashboardEnv): Promise<number>;
//# sourceMappingURL=dashboard.d.ts.map