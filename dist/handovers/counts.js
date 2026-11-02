// Number.isInteger accepts 1e300, whose sums and comparisons lose precision.
export const isCount = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
// Not a parameter of isCount: `list.every(isCount)` would pass the index as the bound.
export const isCountUpTo = (v, max) => isCount(v) && v <= max;
//# sourceMappingURL=counts.js.map