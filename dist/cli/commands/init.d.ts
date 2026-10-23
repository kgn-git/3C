import { type OnExisting } from "../../generator/output.js";
interface InitArgs {
    readonly yes: boolean;
    readonly atRoot: boolean;
    readonly onExisting: OnExisting;
    readonly companion: boolean;
}
export declare function parseInitArgs(rest: readonly string[]): InitArgs;
export declare function initCommand(args: InitArgs): Promise<number>;
export {};
//# sourceMappingURL=init.d.ts.map