// The developer view as a section of the static page. The view's own text is shown as it is: the section title is the
// view's label and the other headings are this page's own. The page has no script, so a prompt is shown as text to select, never a button.
import { esc } from "../html-escape.js";
function promptsHtml(prompts) {
    if (prompts.length === 0)
        return "";
    const issues = [...new Set(prompts.map((p) => p.issue))];
    const groups = issues.map((issue) => {
        const items = prompts.filter((p) => p.issue === issue).map((p) => `<li>${esc(p.label)}<pre>${esc(p.text)}</pre></li>`);
        return `<h4>#${esc(String(issue))}</h4>\n<ul>${items.join("")}</ul>`;
    });
    return `<h3>Prompts to select and copy</h3>\n${groups.join("\n")}`;
}
export function developerSectionHtml(view) {
    const steps = view.nextSteps.length === 0 ? "" : `<h3>Next steps</h3>\n<ol>${view.nextSteps.map((s) => `<li><code>${esc(s)}</code></li>`).join("")}</ol>`;
    return `<h2>${esc(view.label)}</h2>
<pre>${esc(view.results)}</pre>
<p>${esc(view.meaning)}</p>
${steps}
${promptsHtml(view.prompts)}`;
}
//# sourceMappingURL=developer-html.js.map