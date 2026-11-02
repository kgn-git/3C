// A body is at most 64 KiB; JSON can escape each byte to six, and the rest of an issue object adds a few KiB.
const MAX_BODY = 65_536;
const MAX_BUFFER = 6 * MAX_BODY + 16_384;
const CALL_MS = 15_000;
const MAX_TITLE = 300;
const isDate = (v) => typeof v === "string" && v.length <= 64 && !Number.isNaN(Date.parse(v));
/** The issue, or the named reason it could not be read. `number` is checked here, since it reaches the command line. */
export async function fetchIssue(repo, number, gh) {
    if (!Number.isSafeInteger(number) || number <= 0)
        return { ok: false, failure: "not-found", detail: "not an issue number" };
    const out = await gh(["api", "-X", "GET", `repos/${repo}/issues/${number}`], { timeoutMs: CALL_MS, maxBuffer: MAX_BUFFER });
    if (!out.ok) {
        return out.failure === "offline" && out.detail.includes("ERR_CHILD_PROCESS_STDIO_MAXBUFFER") ? { ...out, failure: "too-large" } : out;
    }
    let raw;
    try {
        raw = JSON.parse(out.stdout);
    }
    catch {
        return { ok: false, failure: "offline", detail: "gh returned something that is not JSON" };
    }
    const o = (typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {});
    const { title, body, state, author_association, updated_at } = o;
    // The issues endpoint also answers for a pull request number; a pull request is not an issue to brief.
    if (o["pull_request"] !== undefined && o["pull_request"] !== null)
        return { ok: false, failure: "not-found", detail: "that number is a pull request" };
    if (o["number"] !== number || typeof title !== "string" || (state !== "open" && state !== "closed") || !isDate(updated_at)) {
        return { ok: false, failure: "offline", detail: "gh returned an issue of an unexpected shape" };
    }
    const text = typeof body === "string" ? body : "";
    if (Buffer.byteLength(text, "utf8") > MAX_BODY)
        return { ok: false, failure: "too-large", detail: "the issue body is over the size limit" };
    return {
        ok: true,
        issue: {
            number,
            title: title.slice(0, MAX_TITLE),
            body: text,
            state,
            author_association: typeof author_association === "string" ? author_association : "",
            updated_at,
        },
    };
}
//# sourceMappingURL=briefed-issue.js.map