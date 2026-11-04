import { type Finding, type Scanner } from "./findings.js";
/** CWE-770: bound the finding COLLECTION, not only the bytes read per file. */
export declare const MAX_FINDINGS_PER_FILE = 25;
export declare const UNREADABLE_RULE = "scan-unreadable";
export declare const MISSING_RULE = "scan-missing";
/**
 * A file the gate could not read is not a file it found clean, so it blocks. One that is gone is only noted: the
 * file set has already kept back a deleted file whose staged content still counts, so what reaches here is a file
 * that vanished between the listing and the read.
 */
export declare function unreadFinding(rel: string, code: unknown): Finding;
export declare const defaultLocalScanner: Scanner;
//# sourceMappingURL=scanner.d.ts.map