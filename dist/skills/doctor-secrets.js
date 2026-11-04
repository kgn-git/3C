const SHOWN = 3;
/** Names where secret patterns were found, as types and line numbers only: the matched value is never printed. */
export function whereFound(text, hits) {
    const ordered = [...hits].sort((a, b) => a.index - b.index);
    const found = new Set();
    let line = 1;
    let at = 0;
    for (const hit of ordered) {
        for (; at < hit.index; at++)
            if (text.charCodeAt(at) === 10)
                line++;
        const where = `${hit.type} on line ${line}`;
        found.add(where);
    }
    const all = [...found];
    const more = all.length - SHOWN;
    return more > 0 ? `${all.slice(0, SHOWN).join(", ")} and ${more} more` : all.join(", ");
}
//# sourceMappingURL=doctor-secrets.js.map