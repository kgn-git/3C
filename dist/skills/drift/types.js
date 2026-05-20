// #10 VP-01-F05 Standards Drift Detector — shared types.
// A drift run is an append-only event (AD-04 events → JSONL substrate).
export function isDriftRun(v) {
    return (!!v &&
        typeof v === "object" &&
        v.schema_version === 1);
}
//# sourceMappingURL=types.js.map