const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/**
 * Renders the envelope, and only the envelope: block ordering, spacing, and the
 * numbered step list. Interpretation stays with the calling skill.
 */
export function renderConsole(p) {
    const blocks = [p.results, p.meaning];
    if (p.nextSteps.length > 0) {
        blocks.push(["Next steps:", ...p.nextSteps.map((s, i) => `  ${i + 1}. ${s}`)].join("\n"));
    }
    if (p.artifact !== undefined)
        blocks.push(`Wrote ${p.artifact}`);
    return blocks.join("\n\n");
}
/** Machine-readable form. `nextSteps` is always an array, never omitted. */
export function renderJson(p) {
    return JSON.stringify({
        results: p.results,
        meaning: p.meaning,
        nextSteps: [...p.nextSteps],
        ...(p.artifact !== undefined ? { artifact: p.artifact } : {}),
    });
}
/**
 * Escapes every field here so no caller has to remember to (CWE-79). This is
 * the render boundary — data arrives untrusted and leaves encoded.
 */
export function renderHtml(p) {
    const steps = p.nextSteps
        .map((s) => `<li><code>${esc(s)}</code></li>`)
        .join("");
    return [
        `<section class="presentation">`,
        `<pre class="results">${esc(p.results)}</pre>`,
        `<p class="meaning">${esc(p.meaning)}</p>`,
        steps === "" ? "" : `<ol class="next-steps">${steps}</ol>`,
        p.artifact === undefined
            ? ""
            : `<p class="artifact">${esc(p.artifact)}</p>`,
        `</section>`,
    ]
        .filter((s) => s !== "")
        .join("");
}
//# sourceMappingURL=render.js.map