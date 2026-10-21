// #22 AC5 / NFR-SEC-01, ported into `onboard` by #399 — completion is LOCAL and
// nothing else. A local artifact (user + timestamp only, never any onboarding
// activity) is written when the last module is advanced past.
//
// WHAT #399 RETIRED HERE, and why it is not an omission: the version this
// replaces also read a `notifyCommand` string from `.3c/onboarding-guide.yaml`
// and passed it to an injected runner. That branch could never fire in the
// shipped product — `onboardGuideCommand` never supplied a runner, so
// `if (cmd && runner)` was false at every entry point and only a test ever
// reached it — while both copies of the guide SKILL advertised it to adopters.
// An advertised capability no entry point can reach is the defect epic #392
// exists to close, so it is retired rather than carried across or armed. Arming
// it would have added a workspace-file-to-command execution path inside a
// consolidation whose exit condition is a smaller surface.
import * as yaml from "js-yaml";
import { writeOnboardingFile } from "./user-path.js";
/** Record that this developer finished the roadmap. Local only, no egress. */
export async function recordCompletion(ws, user) {
    // #378: through the shared builder — name allow-list, containment, link refusal.
    await writeOnboardingFile(ws, user, yaml.dump({ user, completedAt: new Date().toISOString() }), "completions");
}
//# sourceMappingURL=completion.js.map