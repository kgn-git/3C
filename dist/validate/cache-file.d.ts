export declare const cacheDir: (ws: string) => string;
/**
 * Writes `name` in the cache directory through a fresh temporary file renamed
 * into place: a rename replaces a planted link rather than writing through
 * it (CWE-59), and a cache directory, or the `.3c` directory above it, that is
 * itself a link is refused, since writes through it would land outside the
 * workspace.
 */
export declare function writeCacheFile(ws: string, name: string, text: string): Promise<void>;
//# sourceMappingURL=cache-file.d.ts.map