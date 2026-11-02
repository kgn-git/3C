export declare const cacheDir: (ws: string) => string;
/**
 * Writes `name` in `dir` (a state directory directly under `.3c`) through a
 * fresh temporary file renamed into place: a rename replaces a planted link
 * rather than writing through it (CWE-59), and a directory, or the `.3c`
 * directory above it, that is itself a link is refused, since writes through
 * it would land outside the workspace.
 */
export declare function writeStateFile(dir: string, name: string, text: string): Promise<void>;
export declare const writeCacheFile: (ws: string, name: string, text: string) => Promise<void>;
//# sourceMappingURL=cache-file.d.ts.map