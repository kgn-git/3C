// `Date.parse` accepts far more than `Date#toISOString` writes (a bare date, an offset, words), and a time read back
// from a file is printed, so only the writer's own form is read.
const MAX_LENGTH = 32; // an extended year such as +275760-09-13T00:00:00.000Z fits
export function isWrittenDate(v) {
    if (typeof v !== "string" || v.length > MAX_LENGTH)
        return false;
    const parsed = new Date(v);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === v;
}
//# sourceMappingURL=written-date.js.map