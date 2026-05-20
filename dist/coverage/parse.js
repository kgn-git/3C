export function parseIstanbulCoverage(json) {
    const out = new Map();
    let data;
    try {
        data = JSON.parse(json);
    }
    catch {
        return out;
    }
    if (!data || typeof data !== "object")
        return out;
    for (const [file, entryRaw] of Object.entries(data)) {
        const entry = entryRaw;
        if (!entry.statementMap || !entry.s)
            continue;
        const covered = new Set();
        for (const [id, loc] of Object.entries(entry.statementMap)) {
            if ((entry.s[id] ?? 0) <= 0)
                continue;
            const a = loc.start?.line ?? 0;
            const b = loc.end?.line ?? a;
            for (let ln = a; ln <= b; ln++)
                if (ln > 0)
                    covered.add(ln);
        }
        out.set(file.replace(/\\/g, "/"), covered);
    }
    return out;
}
//# sourceMappingURL=parse.js.map