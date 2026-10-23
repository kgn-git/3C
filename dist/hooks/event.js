// Reads and parses Claude Code's hook event payload from stdin.
// Claude Code passes PreToolUse / PostToolUse events as a single
// JSON object on stdin. We surface only the fields relevant to L1.
import { MAX_HOOK_EVENT_BYTES, readStdinBounded } from "../validate/_stdin.js";
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
/**
 * Reads the event bounded at MAX_HOOK_EVENT_BYTES. Over the cap it
 * THROWS `StdinTooLargeError` rather than returning a parse failure: the
 * right response differs per event (deny a PreToolUse, skip an advisory
 * PostToolUse), so the caller decides, and an unparsable payload is not
 * allowed to stand in for an oversized one.
 */
export async function readHookEventFromStdin(stream) {
    const text = await readStdinBounded(stream, MAX_HOOK_EVENT_BYTES);
    return parseHookEvent(text);
}
//# sourceMappingURL=event.js.map