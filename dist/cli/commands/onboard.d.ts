import type { Spawn } from "../../skills/onboard/starter.js";
export interface OnboardEnv {
    readonly cwd: string;
    readonly log?: (msg: string) => void;
    /** The OS account name. Injectable so the default-name path is testable. */
    readonly osUser?: () => string;
    /** The `gh` runner for `--starter`. Injectable so each starter outcome is testable. */
    readonly spawn?: Spawn;
}
export declare function onboardCommand(argv: readonly string[], env?: OnboardEnv): Promise<number>;
//# sourceMappingURL=onboard.d.ts.map