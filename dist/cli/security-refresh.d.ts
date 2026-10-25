export interface NpmResult {
    readonly code: number;
    readonly stdout: string;
}
/** The npm runs refresh makes; nothing else can be asked of the runner. */
export type NpmCommand = "version" | "registry" | "audit";
export type NpmRunner = (command: NpmCommand, cwd: string) => Promise<NpmResult>;
export interface Invocation {
    readonly file: string;
    readonly prefix: readonly string[];
}
/**
 * How npm is started, never through a shell. On Windows `npm` is a `.cmd` shim
 * that only cmd.exe can run, and cmd.exe looks in the working directory (the
 * workspace being audited) before PATH, so a planted `npm.cmd` there would run
 * (CWE-427). Instead npm's own script is run with this Node, from the
 * installation next to it or the per-user global prefix. Elsewhere, execvp
 * searches PATH only.
 */
export declare function npmInvocation(platform: NodeJS.Platform, execPath: string, appData: string | undefined, exists?: (p: string) => boolean): Invocation | null;
export declare const npmArgv: (how: Invocation, command: NpmCommand) => string[];
/**
 * The environment is inherited on purpose: npm reads the developer's own
 * registry, proxy and auth settings from it. The project's `.npmrc` is never
 * in reach, because the audit runs in a folder `refreshAdvisories` creates.
 */
export declare const defaultNpmRunner: NpmRunner;
export type RefreshResult = {
    kind: "written";
    count: number;
} | {
    kind: "refused";
    reason: string;
};
/**
 * npm audits copies of package.json and its lockfile in a fresh temporary
 * folder, never the workspace. A workspace `.npmrc` could otherwise point the
 * audit at a registry that answers "clean", or expand a token into a request
 * to a host it names; in the copy, only the developer's own npm settings apply.
 * The versions recorded as audited come from the same bytes npm read, so a
 * lockfile edited while the audit runs cannot be recorded as audited. When
 * npm-shrinkwrap.json exists it is the lockfile, as npm itself prefers it.
 */
export interface RefreshOptions {
    readonly remove?: (dir: string) => Promise<void>;
    readonly warn?: (message: string) => void;
}
export declare function refreshAdvisories(ws: string, run?: NpmRunner, now?: Date, opts?: RefreshOptions): Promise<RefreshResult>;
//# sourceMappingURL=security-refresh.d.ts.map