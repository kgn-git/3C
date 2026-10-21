import type { Progress } from "./progress.js";
import type { Module } from "./roadmap.js";
import type { Spawn, StarterOutcome, StarterTask } from "./starter.js";
export interface RunOnboardOpts {
    readonly user: string;
    readonly level?: string;
    readonly role?: string;
    readonly action?: "advance" | "ask" | "starter";
    readonly query?: string;
    readonly spawn?: Spawn;
    /** True when the developer TYPED `--user`, so printed commands must repeat it (#343). */
    readonly explicitUser?: boolean;
}
export interface RunOnboardResult {
    readonly roadmap: ReadonlyArray<Module>;
    readonly progress: Progress;
    readonly answer?: string;
    readonly starter?: StarterTask | null;
    /** Set on a `--starter` run: found, none, or unavailable (#343 board). */
    readonly starterOutcome?: StarterOutcome;
    /** True on the run that advanced past the last module. */
    readonly completedAll: boolean;
    /** Set when stored ids were dropped — never a silent reset (AC3). */
    readonly invalidated: string | null;
}
/**
 * A stored value made safe to print (CWE-117).
 *
 * The notices below quote values read off disk back to the terminal, and a
 * value carrying ESC or CR can erase and rewrite the line it appears on — so a
 * record could forge the message about itself. `.3c/onboarding/` is the
 * developer's own gitignored file today, which is why this is small rather than
 * absent; the echo path is the thing worth getting right, because the next
 * value routed through it may not be self-authored. Length-capped for the same
 * reason `excerptBody` exists: a stored string is unbounded input.
 */
export declare function forConsole(value: string): string;
export declare function runOnboard(ws: string, opts: RunOnboardOpts): Promise<RunOnboardResult>;
//# sourceMappingURL=index.d.ts.map