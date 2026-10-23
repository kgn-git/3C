// The ship step's write: one closed `handover`-labelled issue per delivery.
// Everything that can stop it stops it before GitHub is touched — a block
// the dashboard could not read, a secret-shaped string — and a re-run finds
// the issue it already filed instead of filing a second one. A failure
// prints the commands to finish by hand, so a handover is never dropped.
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseHandoverBody } from "../../dashboard/handover.js";
import { scanSecrets } from "../../validate/secrets.js";
export const HANDOVER_LABEL_COMMAND = 'gh label create handover --description "3C delivery handover" --color 0E8A16';
const LIST_LIMIT = 1000;
/** The title prefix every handover for these issues shares; the duplicate check keys on it. */
const refsOf = (r) => `Handover — ${r.issues.map((i) => `#${i}`).join(" + ")}`;
export function handoverTitle(r) {
    return r.title === undefined ? refsOf(r) : `${refsOf(r)}: ${r.title}`;
}
// Single quotes are literal in POSIX shells and in PowerShell, so a title made
// only of these characters pastes back as itself. Anything else stays out of
// the printed command (CWE-78): the title is author-written text.
const PASTE_SAFE = /^[\p{L}\p{N} #:+.,_/()[\]—-]*$/u;
const WEB_ROUTE = "Or file it from the web: your repository's Issues → New issue → Handover form, with handover.md as the body.";
export async function fileHandover(body, spawn) {
    const parsed = parseHandoverBody(1, body);
    if (parsed.kind !== "record") {
        const why = parsed.kind === "legacy" ? "the body does not open with a 3c-handover/1 block" : parsed.reason;
        return { ok: false, reason: "invalid-block", message: `Not filed: ${why}.`, manual: [] };
    }
    const hits = scanSecrets(body).hits;
    if (hits.length > 0) {
        // The pattern types only: even a redacted prefix of a secret stays off the terminal.
        const types = [...new Set(hits.map((h) => h.type))].join(", ");
        return {
            ok: false,
            reason: "secret",
            message: `Not filed: the body matches ${hits.length} secret pattern(s) (${types}). Remove them; a handover carries metadata only.`,
            manual: [],
        };
    }
    const title = handoverTitle(parsed.record);
    const safe = PASTE_SAFE.test(title);
    // An unsafe title gets no create command at all — a placeholder pasted as-is
    // would file a mis-titled duplicate — only the web route with the title as text.
    const create = safe ? [`gh issue create --label handover --title '${title}' --body-file handover.md`] : [];
    const failed = (message, labelMissing) => ({
        ok: false,
        reason: "gh-failed",
        message: `${message}${safe ? "" : `\n  Title: ${title}`}\n  ${WEB_ROUTE}`,
        manual: [...(labelMissing ? [HANDOVER_LABEL_COMMAND] : []), ...create],
    });
    const close = async (n, url, created) => {
        const closed = await spawn("gh", ["issue", "close", n, "--reason", "completed"]);
        if (closed.exitCode === 0)
            return { ok: true, created, number: Number(n), url };
        return {
            ok: false,
            reason: "close-failed",
            message: `Filed ${url} but could not close it (${closed.stderr.trim()}).`,
            manual: [`gh issue close ${n} --reason completed`],
        };
    };
    const listed = await spawn("gh", ["issue", "list", "--label", "handover", "--state", "all", "--limit", String(LIST_LIMIT), "--json", "number,title,url,state"]);
    if (listed.exitCode !== 0)
        return failed(`Not filed: the duplicate check failed (${listed.stderr.trim()}).`, false);
    let existing;
    try {
        existing = JSON.parse(listed.stdout);
    }
    catch {
        return failed("Not filed: the duplicate check returned something unreadable.", false);
    }
    // A full page may be a truncated one, and a missed duplicate is a second issue.
    if (existing.length >= LIST_LIMIT)
        return failed(`Not filed: ${LIST_LIMIT} handover issues is more than the duplicate check can see.`, false);
    // Keyed on the issue references, not the free-text title, so a re-run with
    // reworded text still finds the handover already filed.
    const refs = refsOf(parsed.record);
    const same = existing.find((e) => e.title === refs || e.title.startsWith(`${refs}:`));
    if (same?.state === "OPEN") {
        // Probably a run whose close failed — but anyone with the label can open
        // an issue with this title, so it is offered, not closed on their behalf.
        return {
            ok: false,
            reason: "close-failed",
            message: `A handover for these issues is already filed and still open: ${same.url}. Close it if it is yours.`,
            manual: [`gh issue close ${same.number} --reason completed`],
        };
    }
    if (same !== undefined)
        return { ok: true, created: false, number: same.number, url: same.url };
    const dir = await mkdtemp(join(tmpdir(), "3c-handover-"));
    let made;
    try {
        const file = join(dir, "handover.md");
        await writeFile(file, body, { encoding: "utf8", mode: 0o600, flag: "wx" });
        made = await spawn("gh", ["issue", "create", "--label", "handover", "--title", title, "--body-file", file]);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
    if (made.exitCode !== 0) {
        return failed(`Not filed: gh issue create failed (${made.stderr.trim()}).`, /label/i.test(made.stderr) && /not found/i.test(made.stderr));
    }
    const url = made.stdout.trim().split("\n").pop()?.trim() ?? "";
    const n = /\/issues\/(\d+)\/?$/.exec(url)?.[1];
    if (n === undefined) {
        // It may have been filed: offer the check, never a second create.
        return {
            ok: false,
            reason: "gh-failed",
            message: `gh printed no issue URL (${url}), so the handover may already exist. Check before filing again.`,
            manual: ["gh issue list --label handover --state all --limit 20"],
        };
    }
    return close(n, url, true);
}
/** The real gh, bounded: a hung network call must not hang the ship step. */
export const ghSpawn = (cmd, args) => new Promise((resolve) => {
    execFile(cmd, [...args], { timeout: 60_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, encoding: "utf8" }, (err, stdout, stderr) => {
        const code = err === null ? 0 : typeof err.code === "number" ? (err.code) : 1;
        resolve({ exitCode: code, stdout, stderr: stderr || (err?.message ?? "") });
    });
});
//# sourceMappingURL=file-handover.js.map