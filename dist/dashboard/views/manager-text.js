// The words for one measure of the manager view. One wording for each state, so the served panel and the shared page,
// which both show this text, cannot say a figure two ways.
import { fmtCycle } from "../delivery.js";
import { MIN_EVENTS, PERIOD_DAYS } from "./manager-measures.js";
const tenth = (v) => String(Math.round(v * 10) / 10);
const percent = (v) => `${Math.round(v)}%`;
const META = {
    repeats: { label: "Repeats of known lessons per 100 deliveries", one: "delivery", many: "deliveries", show: tenth },
    blocked: { label: "Deliveries whose board recorded a blocking finding", one: "delivery with a verdict", many: "deliveries with a verdict", show: percent },
    cycle: { label: "Branch open to merge, median", one: "delivery with a start and merge time", many: "deliveries with a start and merge time", show: fmtCycle },
    fixed: { label: "Findings fixed in the branch, share of all raised", one: "finding", many: "findings", show: percent },
};
const WORD = { better: "better", same: "about the same", worse: "worse" };
export const MEASURE_ORDER = ["repeats", "blocked", "cycle", "fixed"];
export const measureLabel = (id) => META[id].label;
const events = (id, n) => `${n} ${n === 1 ? META[id].one : META[id].many}`;
const sides = (id, c, p, show) => `Last ${PERIOD_DAYS} days: ${show(c)} (${events(id, c.events)}). Earlier ${PERIOD_DAYS} days: ${show(p)} (${events(id, p.events)}).`;
function shortfall(id, c, p) {
    const parts = [];
    if (c.events < MIN_EVENTS)
        parts.push(`The last ${PERIOD_DAYS} days need ${MIN_EVENTS - c.events} more ${MIN_EVENTS - c.events === 1 ? META[id].one : META[id].many}.`);
    if (p.events < MIN_EVENTS)
        parts.push(`The earlier ${PERIOD_DAYS} days have ${p.events} of the ${MIN_EVENTS} needed. New work counts in the last ${PERIOD_DAYS} days, so this period changes only if an older handover is added.`);
    return parts.join(" ");
}
/** The lines for one measure. `caveat` is why a figure is not a true count, or null; `why` is why an unmeasured one could not be worked out. */
export function measureLines(m, caveat, why = []) {
    const { label } = META[m.id];
    if (m.kind === "unmeasured")
        return [`${label}: not measured yet`, ...why.map((w) => `  ${w}`)];
    const { current: c, previous: p } = m;
    const left = c.left + p.left > 0 ? [`  Left out: ${c.left} in the last ${PERIOD_DAYS} days, ${p.left} in the earlier ${PERIOD_DAYS} days, because they record no figure for this.`] : [];
    if (m.kind === "few") {
        return [`${label}: too few to call`, `  Last ${PERIOD_DAYS} days: ${events(m.id, c.events)}. Earlier ${PERIOD_DAYS} days: ${events(m.id, p.events)}.`, `  ${MIN_EVENTS} are needed in each period. ${shortfall(m.id, c, p)}`, ...left];
    }
    const show = (s) => META[m.id].show(s.value ?? 0);
    const tail = caveat === null ? "" : ` This is not a true count: ${caveat}.`;
    return [`${label}: ${WORD[m.call]}`, `  ${sides(m.id, c, p, show)}${tail}`, ...left];
}
export const LIST_CAP = 10;
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const days = (n) => (n === null ? "age not known" : count(n, "day", "days"));
/** The lines for one list of waiting issues, the issues shown, oldest first and capped, and those of them GitHub says are open. */
export function waitingLines(title, nouns, list) {
    if (list.kind === "unchecked") {
        const noIssue = list.noIssue > 0 ? [noIssueLine(list.noIssue)] : [];
        const head = list.named === 0 ? `${title}: none to check.` : `${title}: could not check which of the ${count(list.named, ...nouns.named)} ${list.named === 1 ? "is" : "are"} still open. Run 3c dashboard to check.`;
        return { lines: [head, ...noIssue], shown: [], open: [] };
    }
    const { entries } = list;
    const open = entries.filter((e) => e.state === "open").length;
    const unchecked = entries.length - open;
    const parts = [...(open > 0 ? [count(open, ...nouns.open)] : []), ...(unchecked > 0 ? [`${unchecked} not checked`] : [])];
    const shown = entries.slice(0, LIST_CAP);
    const lines = [
        entries.length === 0 ? `${title}: none.` : `${title}: ${parts.join(", ")}${oldest(entries[0].days)}`,
        ...shown.map((e) => `  #${e.issue}, ${days(e.days)}${e.state === "open" ? "" : ", state not checked"}`),
    ];
    if (entries.length > LIST_CAP)
        lines.push(`  ${count(entries.length - LIST_CAP, "more is", "more are")} waiting and not shown.`);
    if (list.closed > 0)
        lines.push(`  ${count(list.closed, ...nouns.closed)} left out.`);
    if (list.noIssue > 0)
        lines.push(`  ${noIssueLine(list.noIssue)}`);
    return { lines, shown: shown.map((e) => e.issue), open: shown.filter((e) => e.state === "open").map((e) => e.issue) };
}
const oldest = (d) => (d === null ? "" : `, the oldest is ${days(d)} old`);
const noIssueLine = (n) => `${count(n, "note mentions", "notes mention")} a decision but ${n === 1 ? "names" : "name"} no issue, so ${n === 1 ? "its" : "their"} state cannot be checked. This blocks nothing; name the issue in the handover to have it listed.`;
//# sourceMappingURL=manager-text.js.map