// The manager view as a section of the shared page: the view's own text, which names counts, issue numbers, ages and the
// time of the last fetch, and carries no delivery title, no name and no prompt, because the file can be passed on.
import { esc } from "../html-escape.js";
export function managerSectionHtml(view) {
    const steps = view.nextSteps.length === 0 ? "" : `<h3>Next steps</h3>\n<ol>${view.nextSteps.map((s) => `<li><code>${esc(s)}</code></li>`).join("")}</ol>`;
    return `<h2>${esc(view.label)} (team level)</h2>
<pre>${esc(view.results)}</pre>
<p>${esc(view.meaning)}</p>
${steps}`;
}
//# sourceMappingURL=manager-html.js.map