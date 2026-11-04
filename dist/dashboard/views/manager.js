import { ISSUE_CAP } from "../../handovers/handover-unreadable.js";
import { NO_STORE_LINE, proseDate } from "../../memory/brief-render.js";
import { promptsFor } from "../../memory/prompts.js";
import { refusalLines } from "../../memory/store-gate.js";
import { RETRY_VERB as SYNC } from "../../memory/sync.js";
import { describeDelivery } from "../delivery-status.js";
import { MARGIN, MIN_EVENTS, PERIOD_DAYS, measureAll, splitPeriods } from "./manager-measures.js";
import { MEASURE_ORDER, measureLines, waitingLines } from "./manager-text.js";
import { decisionsWaiting, riskCarried } from "./manager-waiting.js";
import { INSTALL_SKILLS, missingSkillLines } from "./prompt-skills.js";
const REFRESH = "3c dashboard   # fetches the latest handovers";
const DAY_MS = 86_400_000;
const MARGIN_PERCENT = Math.round(MARGIN * 100);
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** No handover data at all, which is different from a period with few deliveries in it. */
function hasNoData(s) {
    const k = s.status;
    return k.kind === "discarded" || k.kind === "outdated" || (k.kind === "failed" && k.fetchedAt === null);
}
/** Why a count may not be the true one, or null when the cache is fresh and holds every handover. */
function countCaveat(s) {
    const why = [];
    if (s.status.kind === "failed")
        why.push("the last fetch from GitHub failed, so these are from an earlier one");
    else if (s.status.kind === "expired")
        why.push("the cache is older than its refresh time");
    if (s.scan.capped)
        why.push(`the cache holds only the newest ${ISSUE_CAP} handovers, so the earlier period may be incomplete`);
    return why.length === 0 ? null : why.join("; ");
}
function authorsLine(authors) {
    if (authors === 1)
        return "These numbers describe one person's work. This blocks nothing.";
    if (authors === null)
        return "Whether these numbers describe one person's work is not measured yet. This blocks nothing.";
    return null;
}
function repeatsWhy(memory, lessons) {
    if (memory.kind === "absent")
        return { matched: null, why: [NO_STORE_LINE] };
    if (memory.kind === "refused")
        return { matched: null, why: [refusalLines("Manager view", memory.refusal)[0]] };
    if (lessons.kind === "matches")
        return { matched: lessons.handovers, why: [] };
    const cannot = "so repeats cannot be counted. This blocks nothing.";
    if (lessons.kind === "absent")
        return { matched: null, why: [`No lessons file is set up in this workspace, ${cannot}`] };
    if (lessons.kind === "empty")
        return { matched: null, why: [`The lessons file holds no lessons, ${cannot}`] };
    return { matched: null, why: [`The lessons file was refused (${lessons.where} ${lessons.why}), ${cannot}`] };
}
function promptRows(issues, second) {
    return issues.flatMap((issue) => promptsFor(issue).filter((p) => p.kind === "brief" || p.kind === second).map((p) => ({ issue, label: p.label, text: p.text })));
}
export function managerView(input) {
    const { memory, source, now } = input;
    const said = describeDelivery(source);
    const noData = hasNoData(source);
    const lines = [said.status, "", "Manager view, team level: counts of deliveries, with no names.", authorsLine(source.authors) ?? ""];
    const next = [];
    if (memory.kind === "absent")
        next.push(SYNC);
    else if (memory.kind === "refused") {
        const step = memory.refusal.next.replaceAll("`", "");
        next.push(step.charAt(0).toUpperCase() + step.slice(1));
    }
    const { matched, why } = repeatsWhy(memory, input.lessons);
    let measured;
    if (noData) {
        measured = MEASURE_ORDER.map((id) => ({ id, kind: "unmeasured" }));
        lines.push("", "The delivery cache has no handover data, so no figure is worked out.");
        next.push(REFRESH);
    }
    else {
        const periods = splitPeriods(source.scan.records, now);
        const start = new Date(now.getTime() - PERIOD_DAYS * DAY_MS).toISOString();
        const before = new Date(now.getTime() - 2 * PERIOD_DAYS * DAY_MS).toISOString();
        lines.push("", `The last ${PERIOD_DAYS} days run from ${proseDate(start)} to ${proseDate(now.toISOString())}; the ${PERIOD_DAYS} days before run from ${proseDate(before)} to ${proseDate(start)}. A change under ${MARGIN_PERCENT}% of the earlier figure reads as about the same.`);
        const aside = [
            ...(periods.undated > 0 ? [`${count(periods.undated, "delivery has", "deliveries have")} no merge time, or one that cannot be read`] : []),
            ...(periods.future > 0 ? [`${count(periods.future, "delivery was", "deliveries were")} merged after this page was built`] : []),
        ];
        if (aside.length > 0)
            lines.push(`${aside.join("; ")}. They are in neither period.`);
        measured = measureAll(periods, matched);
    }
    const caveat = countCaveat(source);
    for (const m of measured)
        lines.push("", ...measureLines(m, caveat, m.id === "repeats" ? why : []));
    if (caveat !== null)
        next.push(REFRESH);
    const prompts = [];
    lines.push("");
    if (noData)
        lines.push("Decisions waiting: not measured yet.", "Risk carried: not measured yet.");
    else {
        if (memory.kind === "usable") {
            const notes = memory.store.notes.filter((n) => n.kind === "open");
            const merged = new Map(source.scan.records.flatMap((r) => (r.merged === undefined ? [] : [[r.handover, r.merged]])));
            const decisions = waitingLines("Decisions waiting", { open: ["open issue", "open issues"], named: ["issue named", "issues named"], closed: ["closed issue is", "closed issues are"] }, decisionsWaiting({ notes, merged, flags: source.flags, now }));
            lines.push(...decisions.lines);
            prompts.push(...promptRows(decisions.open, "decide"));
        }
        else
            lines.push(`Decisions need the memory, so none are listed. Run ${SYNC} to build it.`);
        const risk = waitingLines("Risk carried", { open: ["open follow-up", "open follow-ups"], named: ["follow-up listed", "follow-ups listed"], closed: ["closed follow-up is", "closed follow-ups are"] }, riskCarried({ records: source.scan.records, flags: source.flags, now }));
        lines.push(...risk.lines);
        if (memory.kind === "usable")
            prompts.push(...promptRows(risk.open, "deliver"));
        if (source.flags === null)
            next.push(REFRESH);
        else {
            lines.push(`Open or closed state checked ${proseDate(source.flags.at)}.`);
            if (source.flags.cut > 0)
                lines.push(`${count(source.flags.cut, "issue was", "issues were")} not checked, because the last check covers a fixed number of issues.`);
        }
    }
    const unique = input.withPrompts === false ? [] : prompts.filter((p, i) => prompts.findIndex((q) => q.issue === p.issue && q.label === p.label) === i);
    if (unique.length > 0) {
        const missing = missingSkillLines(input.installed);
        lines.push(...missing);
        if (missing.length > 0)
            next.push(INSTALL_SKILLS);
    }
    if (said.nextSteps[0] !== undefined && source.status.kind !== "fresh" && source.status.kind !== "expired")
        next.push(said.nextSteps[0]);
    const meaning = `This is a team-level view of counts, with no names. A change under ${MARGIN_PERCENT}% of the earlier figure reads as about the same, and a measure with fewer than ${MIN_EVENTS} events in either period is too few to call. An age counts the days since the oldest handover that named the issue was merged.${unique.length > 0 ? " The prompts are advice and block nothing." : ""}`;
    return { id: "manager", label: "Manager", scope: "team", results: lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n").trim(), meaning, nextSteps: [...new Set(next)], prompts: unique };
}
//# sourceMappingURL=manager.js.map