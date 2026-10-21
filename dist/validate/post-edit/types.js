// Leaf module: imports nothing — src/validate/arch-config.ts depends on
// LayerMap from here, so a value import added to this file could close a
// cycle the live boundary gate cannot see (everything here is `engine`).
export const RULE_IDS = [
    "import-order",
    "naming-convention",
    "layer-boundary",
];
//# sourceMappingURL=types.js.map