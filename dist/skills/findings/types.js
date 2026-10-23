// Shared types for the findings store.
// A findings run is an append-only event (AD-04 events → JSONL substrate).
// `arch-check` appends layer-boundary runs here and the dashboard boundary
// panel renders them. The schema and the on-disk path stay fixed so records
// an adopter already accumulated keep parsing.
export function isFindingsRun(v) {
    return (!!v &&
        typeof v === "object" &&
        v.schema_version === 1);
}
//# sourceMappingURL=types.js.map