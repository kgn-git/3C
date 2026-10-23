export interface HookEvent {
    readonly hook_event_name?: string;
    readonly tool_name: string;
    readonly tool_input: Record<string, unknown>;
    readonly session_id?: string;
}
export type ParseEventResult = {
    readonly ok: true;
    readonly event: HookEvent;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function parseHookEvent(json: string): ParseEventResult;
/**
 * Reads the event bounded at MAX_HOOK_EVENT_BYTES. Over the cap it
 * THROWS `StdinTooLargeError` rather than returning a parse failure: the
 * right response differs per event (deny a PreToolUse, skip an advisory
 * PostToolUse), so the caller decides, and an unparsable payload is not
 * allowed to stand in for an oversized one.
 */
export declare function readHookEventFromStdin(stream: AsyncIterable<Buffer>): Promise<ParseEventResult>;
//# sourceMappingURL=event.d.ts.map