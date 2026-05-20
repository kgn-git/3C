// #24 VP-06-F03 — Standards Rationale Database types + normalizer.
// Rationale is plain YAML co-versioned next to its rule (AD-01, no DB).
function str(v) {
    return typeof v === "string" ? v : "";
}
function strArray(v) {
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function incidents(v) {
    if (!Array.isArray(v))
        return [];
    const out = [];
    for (const e of v) {
        if (e && typeof e === "object") {
            const o = e;
            if (typeof o.date === "string" &&
                typeof o.description === "string" &&
                typeof o.link === "string") {
                out.push({ date: o.date, description: o.description, link: o.link });
            }
        }
    }
    return out;
}
function research(v) {
    if (!Array.isArray(v))
        return [];
    const out = [];
    for (const e of v) {
        if (e && typeof e === "object") {
            const o = e;
            if (typeof o.author === "string" &&
                typeof o.title === "string" &&
                typeof o.year === "number" &&
                typeof o.url === "string") {
                out.push({ author: o.author, title: o.title, year: o.year, url: o.url });
            }
        }
    }
    return out;
}
export function normalizeRationale(raw) {
    const o = (raw && typeof raw === "object" ? raw : {});
    return {
        origin: str(o.origin),
        reasoning: str(o.reasoning),
        examples: strArray(o.examples),
        incidents: incidents(o.incidents),
        research: research(o.research),
        docLink: str(o.docLink),
    };
}
//# sourceMappingURL=types.js.map