// Deterministic onboarding roadmap sourced from local project signals
// (CLAUDE.md, .claude/rules, package scripts). No network.
//
// The role table below is a static scaffold, not derived from the workspace:
// deriving role content is an inference problem (nothing in a tree says "these
// files are the frontend"), and that is L3 shaped. A role APPENDS its modules
// to the workspace-derived ones rather than replacing them, so `--role` is
// never the path that skips reading the project.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
async function read(ws, rel) {
    try {
        return await readFile(join(ws, rel), "utf8");
    }
    catch {
        return "";
    }
}
/**
 * Role-tailored modules, appended to the workspace roadmap.
 *
 * Content is the default scaffold; teams replace the bodies with their own.
 * The ids match the retired `onboard-guide/roles.ts` deliberately, because
 * that is what makes the progress migration lossless. A developer part-way
 * through the frontend roadmap keeps every completed module.
 */
const ROLE_MODULES = {
    frontend: [
        { id: "fe-arch", title: "Frontend architecture & component model", body: "UI layering, component conventions, state management." },
        { id: "fe-standards", title: "UI standards & accessibility", body: "Styling rules, a11y, design system in .claude/rules/." },
        { id: "fe-workflow", title: "Frontend build & test workflow", body: "Dev server, component tests, the team's review flow." },
    ],
    backend: [
        { id: "be-arch", title: "Service architecture & boundaries", body: "Module boundaries, dependency direction, data flow." },
        { id: "be-standards", title: "API & data standards", body: "Contracts, validation, security rules in .claude/rules/." },
        { id: "be-workflow", title: "Backend test & migration workflow", body: "Unit/integration tests, migrations, the review flow." },
    ],
    devops: [
        { id: "do-infra", title: "Infrastructure & environments", body: "Environments, configuration, secrets handling." },
        { id: "do-cicd", title: "CI/CD & deployment pipeline", body: "Pipeline stages, the release gate, rollback." },
        { id: "do-observability", title: "Observability & incident response", body: "Telemetry, alerts, the incident runbook." },
    ],
};
/** The roles `--role` accepts. Anything else is rejected, not defaulted. */
export const KNOWN_ROLES = Object.keys(ROLE_MODULES);
/** True for a role this build knows. `Object.hasOwn`, so no prototype key passes. */
export function isKnownRole(role) {
    return Object.hasOwn(ROLE_MODULES, role);
}
/**
 * How much of a module body the console shows at once.
 *
 * The bodies are printed because the project-derived content is the whole
 * difference between this and a static checklist. Printing them UNBOUNDED is
 * the other failure: `architecture`'s body IS the whole of CLAUDE.md, so an
 * adopter with a 400-line file would get it dumped on every invocation.
 */
export const EXCERPT_LINES = 14;
/** A module body trimmed to the console bound, marked when it was cut. */
export function excerptBody(body) {
    const lines = body.split("\n");
    if (lines.length <= EXCERPT_LINES)
        return body;
    return [
        ...lines.slice(0, EXCERPT_LINES),
        "    … (excerpt — read CLAUDE.md and .claude/rules/ in full)",
    ].join("\n");
}
/**
 * The workspace-derived roadmap, plus the role's modules when one is given.
 *
 * Fails closed on an unrecognised role. Falling through to a GENERIC roadmap
 * would let a typo silently seed a different set of modules under the
 * developer's name — deny-by-default is the house rule for a
 * validated input, and a roadmap is exactly the thing a typo must not choose.
 */
export async function buildRoadmap(ws, role) {
    if (role !== undefined && role !== null && role !== "" && !isKnownRole(role)) {
        throw new Error(`unknown role \`${role}\` — expected one of: ${KNOWN_ROLES.join(", ")}`);
    }
    const claude = (await read(ws, "CLAUDE.md")) || (await read(ws, ".claude/CLAUDE.md"));
    const pkg = await read(ws, "package.json");
    let scripts = "";
    try {
        const j = JSON.parse(pkg);
        scripts = Object.keys(j.scripts ?? {}).join(", ");
    }
    catch {
        /* no package.json */
    }
    const base = [
        {
            id: "architecture",
            title: "Architecture overview",
            body: claude.trim() ||
                "Read CLAUDE.md and .claude/rules/ for the team's architecture conventions.",
        },
        {
            id: "key-files",
            title: "Key files & standards",
            body: "Standards live in .claude/rules/; project context in CLAUDE.md.",
        },
        {
            id: "workflows",
            title: "Core workflows",
            body: scripts
                ? `Project scripts: ${scripts}.`
                : "See CLAUDE.md for the team's core development workflows.",
        },
    ];
    // Appended, never substituted — see the module header.
    return role ? [...base, ...ROLE_MODULES[role]] : base;
}
//# sourceMappingURL=roadmap.js.map