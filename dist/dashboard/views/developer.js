import { NO_STORE_LINE, proseDate } from "../../memory/brief-render.js";
import { WEEK_DAYS } from "../../memory/lessons.js";
import { ABSENT_LINES, EMPTY_LINES, refusedLines } from "../../memory/lessons-render.js";
import { ghViewCommand, isIssueNumber, promptsFor } from "../../memory/prompts.js";
import { refusalLines } from "../../memory/store-gate.js";
import { RETRY_VERB as SYNC } from "../../memory/sync.js";
import { describeDelivery } from "../delivery-status.js";
import { waitingFollowUps } from "./follow-ups.js";
import { INSTALL_SKILLS, missingSkillLines } from "./prompt-skills.js";
const REFRESH = "3c dashboard   # fetches the latest handovers";
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function lessonLines(memory, lessons) {
    if (memory.kind !== "usable")
        return [`Lessons need the memory, so none are shown. Run ${SYNC} to build it.`];
    if (lessons.kind === "absent")
        return [...ABSENT_LINES];
    if (lessons.kind === "empty")
        return [...EMPTY_LINES];
    if (lessons.kind === "refused")
        return refusedLines(lessons.where, lessons.why);
    const head = `This week's lesson matches (merged in the last ${WEEK_DAYS} days):`;
    const caveat = lessons.caveat === null ? [] : [`  These dates may be wrong or missing: ${lessons.caveat}.`];
    // A handover number outside isIssueNumber's range is left out, because the command that reads it is built from a checked number.
    const weekly = lessons.weekly.filter((w) => isIssueNumber(w.handover));
    if (weekly.length === 0)
        return [head, `  No matching handover was merged in the last ${WEEK_DAYS} days. To see every lesson's figures, run 3c memory lessons.`, ...caveat];
    return [head, ...weekly.map((w) => `  ${w.lesson}: handover #${w.handover}, merged ${proseDate(w.merged)}. To read it, run ${ghViewCommand(w.handover)}.`), ...caveat];
}
export function developerView(input) {
    const { memory, source } = input;
    const said = describeDelivery(source);
    const waiting = waitingFollowUps({ records: source.scan.records, flags: source.flags });
    const lines = [said.header, said.status, ""];
    const next = [];
    if (memory.kind === "absent") {
        lines.push(`${NO_STORE_LINE} No prompt is shown without it.`);
        next.push(SYNC);
    }
    else if (memory.kind === "refused") {
        lines.push(refusalLines("Developer view", memory.refusal)[0], "No prompt is shown without it.");
        // A backtick marks a command in the refusal; the step is shown in a code element, so the mark is left out.
        const step = memory.refusal.next.replaceAll("`", "");
        next.push(step.charAt(0).toUpperCase() + step.slice(1));
    }
    if (waiting.rows.length === 0) {
        lines.push("No follow-up is waiting, so there is nothing to pick up.");
        next.push(REFRESH);
    }
    else {
        lines.push("Waiting follow-ups:");
        for (const r of waiting.rows)
            lines.push(`  #${r.issue} (listed in handover #${r.named}): ${r.state === "open" ? "open" : "state not checked"}`);
    }
    if (waiting.more > 0)
        lines.push(`${count(waiting.more, "more is", "more are")} waiting and not shown.`);
    if (waiting.closed > 0)
        lines.push(`${count(waiting.closed, "closed follow-up is", "closed follow-ups are")} left out.`);
    if (source.flags !== null && source.flags.cut > 0)
        lines.push(`${count(source.flags.cut, "issue was", "issues were")} not checked, because the last check covers a fixed number of issues.`);
    const prompts = memory.kind === "usable" ? waiting.rows.flatMap((r) => promptsFor(r.issue).map((p) => ({ issue: r.issue, label: p.label, text: p.text }))) : [];
    if (prompts.length > 0) {
        const missing = missingSkillLines(input.installed);
        lines.push(...missing);
        if (missing.length > 0)
            next.push(INSTALL_SKILLS);
    }
    lines.push("", ...lessonLines(memory, input.lessons));
    if (memory.kind === "usable" && input.lessons.kind === "week" && input.lessons.caveat !== null)
        next.push(REFRESH);
    if (source.status.kind !== "fresh" && source.status.kind !== "expired" && said.nextSteps[0] !== undefined)
        next.push(said.nextSteps[0]);
    const unchecked = source.flags === null && waiting.rows.length > 0 ? " Whether each issue is open or closed was not checked, so a closed issue may be listed. Run 3c dashboard to check." : "";
    const meaning = `These follow-ups are issues a handover asked for that no later handover delivered. The prompts are advice and block nothing.${unchecked}`;
    return { id: "developer", label: "Developer", results: lines.join("\n"), meaning, nextSteps: [...new Set(next)], prompts };
}
//# sourceMappingURL=developer.js.map