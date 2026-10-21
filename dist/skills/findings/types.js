// #394 (was #10) — shared types for the findings store.
// A findings run is an append-only event (AD-04 events → JSONL substrate).
// The store outlived the `drift` verb that used to write it: `arch-check`
// appends layer-boundary runs here and the dashboard boundary panel renders
// them. Records an adopter accumulated before #394 keep parsing unchanged —
// the schema and the on-disk path are exactly what they were.
export function isFindingsRun(v) {
    return (!!v &&
        typeof v === "object" &&
        v.schema_version === 1);
}
//# sourceMappingURL=types.js.map