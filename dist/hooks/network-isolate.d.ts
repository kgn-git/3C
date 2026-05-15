export interface IsolateOptions {
    readonly command: string;
    readonly network: boolean;
    readonly platform?: NodeJS.Platform;
}
export interface IsolatedCommand {
    readonly executable: string;
    readonly args: ReadonlyArray<string>;
    readonly platformWarning?: string;
}
export declare function buildIsolatedCommand(opts: IsolateOptions): IsolatedCommand;
//# sourceMappingURL=network-isolate.d.ts.map