/**
 * Every pipe-fed verb reads a bounded stream (CWE-400). Returns null when the
 * input is over the cap, having already reported it AND the verb's own
 * recovery route. The route is a required parameter so that no caller can
 * refuse with no way forward — a dead-end.
 */
export declare function readBoundedStdin(verb: string, route: string, stream?: AsyncIterable<Buffer>): Promise<string | null>;
//# sourceMappingURL=read-input.d.ts.map