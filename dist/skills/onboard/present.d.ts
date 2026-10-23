import type { Presentation } from "../../output/index.js";
import type { Progress } from "./progress.js";
/** Status only: no activity trail, no analytics, no egress (NFR-SEC-01). */
export declare function presentOnboarding(progress: ReadonlyArray<Progress>): Presentation;
/** What `onboardNextLines` needs beyond the record. */
export interface NextStepContext {
    /** The CLI binary to name in commands (`3c`). */
    readonly slug: string;
    /**
     * The developer's name when they TYPED `--user`, else null. Commands carry
     * `--user <name>` only then: without the flag, a suggested command resumes
     * the OS user's record — a different person's progress.
     */
    readonly explicitUser: string | null;
    /**
     * What a `--starter` request on THIS run found, if one was made. After a
     * miss, suggesting `--starter` again would loop; after a hit, "pick a first
     * task" would contradict the task just printed.
     */
    readonly starter?: {
        readonly kind: "found";
        readonly number: number;
    } | {
        readonly kind: "none" | "unavailable";
    };
}
/**
 * The lines that end every `onboard` run: how far along the developer is and
 * the exact next command. Pure, so each state is testable without the CLI.
 *
 * Suggested commands never carry `--role`: the role is remembered in the record,
 * and repeating it would invite a typo that changes the roadmap.
 */
export declare function onboardNextLines(roadmapIds: ReadonlyArray<string>, progress: Progress, ctx: NextStepContext): string[];
//# sourceMappingURL=present.d.ts.map