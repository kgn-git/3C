// Reads and parses Claude Code's hook event payload from stdin.
// Claude Code passes PreToolUse / PostToolUse events as a single
// JSON object on stdin. We surface only the fields relevant to L1.
export function parseHookEvent(json) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (err) {
        return { ok: false, error: `invalid JSON: ${err.message}` };
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "hook event payload must be a JSON object" };
    }
    const obj = parsed;
    if (typeof obj.tool_name !== "string" || obj.tool_name === "") {
        return { ok: false, error: 'hook event missing required field "tool_name"' };
    }
    if (obj.tool_input === undefined ||
        obj.tool_input === null ||
        typeof obj.tool_input !== "object" ||
        Array.isArray(obj.tool_input)) {
        return {
            ok: false,
            error: 'hook event "tool_input" must be a JSON object',
        };
    }
    const event = {
        tool_name: obj.tool_name,
        tool_input: obj.tool_input,
        ...(typeof obj.hook_event_name === "string"
            ? { hook_event_name: obj.hook_event_name }
            : {}),
        ...(typeof obj.session_id === "string"
            ? { session_id: obj.session_id }
            : {}),
    };
    return { ok: true, event };
}
export async function readHookEventFromStdin(stream) {
    let buffer = "";
    for await (const chunk of stream) {
        buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    return parseHookEvent(buffer);
}
//# sourceMappingURL=event.js.map