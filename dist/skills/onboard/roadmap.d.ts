export interface Module {
    readonly id: string;
    readonly title: string;
    readonly body: string;
}
/** The roles `--role` accepts. Anything else is rejected, not defaulted. */
export declare const KNOWN_ROLES: ReadonlyArray<string>;
/** True for a role this build knows. `Object.hasOwn`, so no prototype key passes. */
export declare function isKnownRole(role: string): boolean;
/**
 * How much of a module body the console shows at once (#399 AC4).
 *
 * The bodies were computed and thrown away before this — the CLI printed
 * `id — title` only, discarding the project-derived content that is the whole
 * difference between this and a static checklist. Printing them UNBOUNDED is
 * the other failure: `architecture`'s body IS the whole of CLAUDE.md, so an
 * adopter with a 400-line file would get it dumped on every invocation.
 */
export declare const EXCERPT_LINES = 14;
/** A module body trimmed to the console bound, marked when it was cut. */
export declare function excerptBody(body: string): string;
/**
 * The workspace-derived roadmap, plus the role's modules when one is given.
 *
 * Fails closed on an unrecognised role. Pre-#399 an unknown value fell through
 * to a GENERIC roadmap, so a typo silently seeded a different set of modules
 * under the developer's name — deny-by-default is the house rule for a
 * validated input, and a roadmap is exactly the thing a typo must not choose.
 */
export declare function buildRoadmap(ws: string, role?: string | null): Promise<ReadonlyArray<Module>>;
//# sourceMappingURL=roadmap.d.ts.map