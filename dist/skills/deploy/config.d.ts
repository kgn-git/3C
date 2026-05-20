export interface DeployConfig {
    readonly deploy?: string;
    readonly rollback?: string;
    readonly health?: string;
    readonly checks: {
        readonly tests?: string;
        readonly reviews?: string;
    };
    readonly productionEnvs: ReadonlyArray<string>;
}
export declare function loadDeployConfig(ws: string): Promise<DeployConfig | null>;
//# sourceMappingURL=config.d.ts.map