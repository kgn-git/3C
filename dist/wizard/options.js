// Curated wizard options for `${BRAND_SLUG} init` per #1 ACs.
// Each option carries an id (stable, used for fragment lookup), a human label,
// a one-line description, and (where applicable) an authoritative source citation.
// Per session feedback memory: prefer source-grounded curated lists over runtime
// MCP-server queries at L1 (offline-first per AD-15).
export const PROJECT_TYPE = {
    id: "project-type",
    label: "Project type",
    multiSelect: false,
    options: [
        {
            id: "library",
            label: "Library / package",
            description: "Reusable code published for other projects to consume.",
        },
        {
            id: "application",
            label: "Application / service",
            description: "Standalone runtime — web app, API, daemon, batch job.",
        },
        {
            id: "monorepo",
            label: "Monorepo",
            description: "Multiple packages or services in one repository.",
        },
        {
            id: "cli",
            label: "CLI tool",
            description: "Command-line tool installed and invoked by users or CI.",
        },
        {
            id: "extension",
            label: "Browser / editor extension",
            description: "Plugin running inside a host application.",
        },
        {
            id: "other",
            label: "Other",
            description: "Project type not listed.",
        },
    ],
};
export const LANGUAGE = {
    id: "language",
    label: "Primary language",
    multiSelect: false,
    options: [
        { id: "typescript", label: "TypeScript", description: "TypeScript on Node.js or browser." },
        { id: "javascript", label: "JavaScript", description: "Plain JavaScript on Node.js or browser." },
        { id: "python", label: "Python", description: "Python 3.x." },
        { id: "go", label: "Go", description: "Go 1.20+." },
        { id: "rust", label: "Rust", description: "Rust stable." },
        { id: "java-kotlin", label: "Java / Kotlin", description: "JVM languages on the OpenJDK family." },
        { id: "csharp", label: "C# / .NET", description: ".NET 8+ / C#." },
        { id: "other", label: "Other", description: "Language not listed." },
    ],
};
export const ARCHITECTURE = {
    id: "architecture",
    label: "Architectural style",
    multiSelect: false,
    options: [
        {
            id: "solid",
            label: "SOLID Principles",
            description: "Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Foundational object-oriented design principles.",
            source: {
                name: "Robert C. Martin — Agile Software Development: Principles, Patterns, and Practices (Pearson)",
                url: "https://en.wikipedia.org/wiki/SOLID",
                year: 2003,
            },
        },
        {
            id: "clean-architecture",
            label: "Clean Architecture",
            description: "Concentric layers with the Dependency Rule: outer layers depend on inner; use cases at the centre, frameworks at the edges.",
            source: {
                name: "Robert C. Martin — Clean Architecture: A Craftsman's Guide to Software Structure and Design (Prentice Hall)",
                url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
                year: 2017,
            },
        },
        {
            id: "hexagonal",
            label: "Hexagonal Architecture (Ports & Adapters)",
            description: "Application core surrounded by ports (interfaces) and adapters (implementations) — driver and driven sides clearly separated.",
            source: {
                name: "Alistair Cockburn — Hexagonal Architecture",
                url: "https://alistair.cockburn.us/hexagonal-architecture/",
                year: 2005,
            },
        },
        {
            id: "onion",
            label: "Onion Architecture",
            description: "Domain model at the centre, application services around it, infrastructure at the outer ring. Variant of clean/hexagonal.",
            source: {
                name: "Jeffrey Palermo — The Onion Architecture",
                url: "https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/",
                year: 2008,
            },
        },
        {
            id: "ddd",
            label: "Domain-Driven Design (DDD)",
            description: "Bounded contexts, ubiquitous language, aggregates, domain events. Tactical and strategic patterns for complex domains.",
            source: {
                name: "Eric Evans — Domain-Driven Design (Addison-Wesley)",
                url: "https://www.domainlanguage.com/ddd/",
                year: 2003,
            },
        },
        {
            id: "cqrs",
            label: "CQRS / Event Sourcing",
            description: "Separate write model (commands) from read model (queries); persist state as a sequence of events. Often paired with DDD.",
            source: {
                name: "Greg Young — CQRS Documents",
                url: "https://cqrs.wordpress.com/documents/",
                year: 2010,
            },
        },
        {
            id: "vertical-slice",
            label: "Vertical Slice Architecture",
            description: "Organise code by feature rather than by horizontal layer. Each slice owns its own controller, domain, and persistence.",
            source: {
                name: "Jimmy Bogard — Vertical Slice Architecture",
                url: "https://www.jimmybogard.com/vertical-slice-architecture/",
                year: 2018,
            },
        },
        {
            id: "modular-monolith",
            label: "Modular Monolith",
            description: "Single deployable unit composed of independent modules with strict boundaries. A pragmatic alternative to microservices.",
            source: {
                name: "Sam Newman — Building Microservices (O'Reilly)",
                url: "https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/",
                year: 2021,
            },
        },
        {
            id: "microservices",
            label: "Microservices (with bounded contexts)",
            description: "Independently deployable services owning a bounded context, communicating over the network with explicit contracts.",
            source: {
                name: "Sam Newman — Building Microservices (O'Reilly)",
                url: "https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/",
                year: 2021,
            },
        },
        {
            id: "layered",
            label: "Layered (n-tier)",
            description: "Traditional presentation / business / data tiers with calls flowing top-down.",
            source: {
                name: "Buschmann et al. — Pattern-Oriented Software Architecture (Wiley)",
                year: 1996,
            },
        },
        {
            id: "convention-driven",
            label: "Convention-driven (no specific style)",
            description: "No formal architectural pattern. Follow existing conventions in the codebase.",
        },
    ],
};
export const TEST_METHODOLOGY = {
    id: "test-methodology",
    label: "Test methodology",
    multiSelect: false,
    options: [
        {
            id: "test-pyramid",
            label: "Test Pyramid (unit-heavy)",
            description: "Many fast unit tests, fewer integration tests, very few end-to-end tests.",
            source: {
                name: "Mike Cohn — Succeeding with Agile (Addison-Wesley)",
                year: 2009,
            },
        },
        {
            id: "testing-trophy",
            label: "Testing Trophy (integration-heavy)",
            description: "Static analysis + many integration tests + some unit tests + few end-to-end. Optimised for confidence per cost.",
            source: {
                name: "Kent C. Dodds — The Testing Trophy",
                url: "https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications",
                year: 2021,
            },
        },
        {
            id: "tdd",
            label: "TDD (red / green / refactor)",
            description: "Write a failing test first, then minimum code to pass, then refactor. Drives design from required behaviour.",
            source: {
                name: "Kent Beck — Test-Driven Development by Example (Addison-Wesley)",
                year: 2003,
            },
        },
        {
            id: "bdd",
            label: "BDD (behaviour-specified)",
            description: "Tests as behaviour specifications using Given/When/Then. Focus on collaboration between business and engineering.",
            source: {
                name: "Dan North — Introducing BDD",
                url: "https://dannorth.net/introducing-bdd/",
                year: 2006,
            },
        },
        {
            id: "property-based",
            label: "Property-based testing",
            description: "Tests assert properties (invariants) over generated inputs rather than specific examples.",
            source: {
                name: "QuickCheck (Claessen & Hughes)",
                url: "https://hackage.haskell.org/package/QuickCheck",
                year: 2000,
            },
        },
        {
            id: "no-methodology",
            label: "No specific methodology",
            description: "Tests added pragmatically; team has not committed to a formal approach.",
        },
    ],
};
export const TEST_FRAMEWORK = {
    id: "test-framework",
    label: "Test framework",
    multiSelect: false,
    options: [
        {
            id: "vitest",
            label: "Vitest",
            description: "Vite-native, ESM-first, Jest-compatible API. Recommended for new TypeScript projects.",
            source: { name: "vitest.dev", url: "https://vitest.dev/" },
        },
        {
            id: "jest",
            label: "Jest",
            description: "Mature JavaScript testing framework with rich ecosystem.",
            source: { name: "jestjs.io", url: "https://jestjs.io/" },
        },
        {
            id: "mocha",
            label: "Mocha",
            description: "Flexible JavaScript test runner; pair with Chai or other assertion libraries.",
            source: { name: "mochajs.org", url: "https://mochajs.org/" },
        },
        {
            id: "node-test",
            label: "Node built-in test runner",
            description: "Zero-dependency tests using node:test (Node 18+ stable).",
            source: { name: "Node.js test runner", url: "https://nodejs.org/api/test.html" },
        },
        {
            id: "tap",
            label: "Tap",
            description: "Test Anything Protocol implementation for Node.",
            source: { name: "node-tap.org", url: "https://node-tap.org/" },
        },
        {
            id: "playwright",
            label: "Playwright (E2E)",
            description: "Browser end-to-end testing for web applications.",
            source: { name: "playwright.dev", url: "https://playwright.dev/" },
        },
        {
            id: "skip",
            label: "Skip — set later",
            description: "Defer the choice; no framework-specific rules in CLAUDE.md.",
        },
    ],
};
export const SECURITY_FRAMEWORK = {
    id: "security-framework",
    label: "Security baseline (multi-select)",
    multiSelect: true,
    options: [
        {
            id: "owasp-top-10-2025",
            label: "OWASP Top 10:2025",
            description: "Most prevalent web-application security risks. 2025 edition adds A03 Software Supply Chain Failures and A10 Mishandling of Exceptional Conditions.",
            source: { name: "OWASP Foundation", url: "https://owasp.org/Top10/2025/", year: 2025 },
        },
        {
            id: "owasp-asvs",
            label: "OWASP ASVS (Application Security Verification Standard)",
            description: "Verification requirements organised into Levels 1 / 2 / 3 of rigour. Use as checklist for code review and pentest.",
            source: {
                name: "OWASP ASVS",
                url: "https://owasp.org/www-project-application-security-verification-standard/",
            },
        },
        {
            id: "nist-ssdf",
            label: "NIST SSDF (Secure Software Development Framework)",
            description: "NIST SP 800-218: practices to integrate security throughout the SDLC. Suitable for federal and regulated contexts.",
            source: { name: "NIST SP 800-218", url: "https://csrc.nist.gov/publications/detail/sp/800-218/final" },
        },
        {
            id: "iso-27001",
            label: "ISO 27001 / 27002",
            description: "Information security management system standard with control catalogue (Annex A).",
            source: { name: "ISO/IEC 27001:2022", url: "https://www.iso.org/standard/27001" },
        },
        {
            id: "cis-controls-v8",
            label: "CIS Controls v8",
            description: "Prioritised set of 18 controls and 153 safeguards; pragmatic baseline.",
            source: { name: "Center for Internet Security", url: "https://www.cisecurity.org/controls" },
        },
        {
            id: "convention-driven",
            label: "Convention-driven (no formal framework)",
            description: "Team applies general secure-coding hygiene without committing to a named framework.",
        },
    ],
};
export const SECURITY_TOOLING = {
    id: "security-tooling",
    label: "Security tooling (multi-select)",
    multiSelect: true,
    options: [
        {
            id: "gitleaks",
            label: "gitleaks",
            description: "Pre-commit and CI secrets scanner.",
            source: { name: "gitleaks", url: "https://github.com/gitleaks/gitleaks" },
        },
        {
            id: "trufflehog",
            label: "trufflehog",
            description: "Deep secrets scanner; good complement to gitleaks for retroactive history scans.",
            source: { name: "trufflehog", url: "https://github.com/trufflesecurity/trufflehog" },
        },
        {
            id: "semgrep",
            label: "Semgrep",
            description: "SAST with custom rule support. Has an official MCP server (config write deferred to follow-up issue).",
            source: { name: "Semgrep", url: "https://semgrep.dev/" },
        },
        {
            id: "snyk",
            label: "Snyk",
            description: "SCA + SAST + container scanning. Has an official MCP server (config write deferred).",
            source: { name: "Snyk", url: "https://snyk.io/" },
        },
        {
            id: "codeql",
            label: "CodeQL",
            description: "GitHub-native deep static analysis with a query language for custom rules.",
            source: { name: "GitHub CodeQL", url: "https://codeql.github.com/" },
        },
        {
            id: "dependabot",
            label: "Dependabot / Renovate",
            description: "Automated dependency updates and vulnerability alerts.",
            source: { name: "Dependabot", url: "https://github.com/dependabot" },
        },
        {
            id: "npm-audit",
            label: "npm audit",
            description: "Built-in npm vulnerability check against the GitHub Advisory Database.",
            source: { name: "npm docs", url: "https://docs.npmjs.com/cli/v10/commands/npm-audit" },
        },
        {
            id: "none",
            label: "None of the above / set later",
            description: "Skip tooling-specific rules.",
        },
    ],
};
export const ALL_CATEGORIES = [
    PROJECT_TYPE,
    LANGUAGE,
    ARCHITECTURE,
    TEST_METHODOLOGY,
    TEST_FRAMEWORK,
    SECURITY_FRAMEWORK,
    SECURITY_TOOLING,
];
export function findOption(category, id) {
    return category.options.find((o) => o.id === id);
}
//# sourceMappingURL=options.js.map