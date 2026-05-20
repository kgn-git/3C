const IMPORT_RE = /^import\s.+\sfrom\s+["']([^"']+)["'];?\s*$/;
export function checkImportOrder(content) {
    const lines = content.split("\n");
    const sources = [];
    for (let i = 0; i < lines.length; i++) {
        const m = IMPORT_RE.exec(lines[i].trim());
        if (m)
            sources.push({ line: i + 1, src: m[1] });
        else if (sources.length > 0)
            break; // only the leading contiguous block
    }
    if (sources.length < 2)
        return [];
    const sorted = [...sources].sort((a, b) => a.src.localeCompare(b.src));
    for (let i = 0; i < sources.length; i++) {
        if (sources[i].src !== sorted[i].src) {
            return [
                {
                    ruleId: "import-order",
                    line: sources[0].line,
                    message: "imports are not alphabetised by source",
                },
            ];
        }
    }
    return [];
}
//# sourceMappingURL=imports.js.map