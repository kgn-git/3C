// #22 AC1 — role-tailored onboarding roadmaps. Reuses the #15 Module shape.
// Content is the default scaffold; teams replace bodies with their own.
const FRONTEND = [
    { id: "fe-arch", title: "Frontend architecture & component model", body: "UI layering, component conventions, state management." },
    { id: "fe-standards", title: "UI standards & accessibility", body: "Styling rules, a11y, design system in .claude/rules/." },
    { id: "fe-workflow", title: "Frontend build & test workflow", body: "Dev server, component tests, the team's review flow." },
];
const BACKEND = [
    { id: "be-arch", title: "Service architecture & boundaries", body: "Module boundaries, dependency direction, data flow." },
    { id: "be-standards", title: "API & data standards", body: "Contracts, validation, security rules in .claude/rules/." },
    { id: "be-workflow", title: "Backend test & migration workflow", body: "Unit/integration tests, migrations, the review flow." },
];
const DEVOPS = [
    { id: "do-infra", title: "Infrastructure & environments", body: "Environments, configuration, secrets handling." },
    { id: "do-cicd", title: "CI/CD & deployment pipeline", body: "Pipeline stages, the deploy gate, rollback." },
    { id: "do-observability", title: "Observability & incident response", body: "Telemetry, alerts, the incident runbook." },
];
const GENERIC = [
    { id: "g-arch", title: "Architecture overview", body: "Read CLAUDE.md and .claude/rules/." },
    { id: "g-standards", title: "Team standards", body: "Conventions in .claude/rules/." },
    { id: "g-workflow", title: "Core workflows", body: "The team's development lifecycle." },
];
export function roleRoadmap(role) {
    switch (role) {
        case "frontend":
            return FRONTEND;
        case "backend":
            return BACKEND;
        case "devops":
            return DEVOPS;
        default:
            return GENERIC;
    }
}
//# sourceMappingURL=roles.js.map