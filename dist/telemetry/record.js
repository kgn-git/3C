export function isTelemetryEvent(v) {
    return (!!v &&
        typeof v === "object" &&
        v.schema_version === 1);
}
//# sourceMappingURL=record.js.map