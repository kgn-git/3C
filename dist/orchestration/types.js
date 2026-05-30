// #256: shared finding schema for the orchestration layer. Specialist agents
// emit Finding[]; the review board collects them by agent and reconcileFindings
// produces a BoardReport. Kept dependency-free so it is trivially testable and
// importable by both the CLI and (future) skill-side tooling.
export {};
//# sourceMappingURL=types.js.map